import random
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.complaint import Complaint, ComplaintStatus
from app.models.master_issue import MasterIssue
from app.models.ai_analysis import AIAnalysis
from app.models.status_history import StatusHistory
from app.ai.location_matcher import calculate_location_similarity
from app.ai.duplicate_detector import DuplicateDetectionAgent, DuplicateAnalysisResult

logger = logging.getLogger("campus_ai.duplicate_service")

def format_status_title(status_val) -> str:
    if hasattr(status_val, "value"):
        return str(status_val.value).capitalize()
    return str(status_val).capitalize()

def generate_master_issue_id() -> str:
    """Generates unique Master Issue IDs like #MI-1042"""
    return f"#MI-{random.randint(1000, 9999)}"

async def find_candidate_complaints(
    db: AsyncSession,
    new_complaint: Complaint,
    limit: Optional[int] = None
) -> List[Complaint]:
    """
    Finds reasonable candidate complaints:
    - Active / non-rejected complaints
    - Recent complaints (within settings.DUPLICATE_SEARCH_DAYS)
    - Filtered by same/similar category OR same/similar location
    - Ordered by created_at desc up to candidate limit
    """
    candidate_limit = limit or settings.DUPLICATE_CANDIDATE_LIMIT
    search_cutoff = datetime.utcnow() - timedelta(days=settings.DUPLICATE_SEARCH_DAYS)

    # Query active/open recent complaints excluding self
    query = (
        select(Complaint)
        .where(
            Complaint.complaint_id != new_complaint.complaint_id,
            Complaint.status != ComplaintStatus.REJECTED,
            Complaint.created_at >= search_cutoff
        )
        .order_by(desc(Complaint.created_at))
        .limit(candidate_limit * 3) # fetch slightly wider set to allow location filtering
    )

    result = await db.execute(query)
    all_recent = result.scalars().all()

    candidates: List[Complaint] = []
    for cand in all_recent:
        same_cat = (cand.category.strip().lower() == new_complaint.category.strip().lower())
        same_loc, sim_score, _ = calculate_location_similarity(cand.location, new_complaint.location)

        # Include if category matches OR location matches/overlaps
        if same_cat or same_loc:
            candidates.append(cand)
            if len(candidates) >= candidate_limit:
                break

    return candidates

async def link_to_master_issue(
    db: AsyncSession,
    duplicate_complaint: Complaint,
    matched_complaint_id: str,
    action_by_note: Optional[str] = None
) -> MasterIssue:
    """
    Links a duplicate complaint to a Master Issue:
    - If the matched complaint already has a Master Issue, attaches duplicate to it.
    - If not, creates a new Master Issue grouping both complaints.
    """
    clean_target_id = matched_complaint_id.strip()
    res = await db.execute(
        select(Complaint)
        .where(
            (Complaint.complaint_id == clean_target_id) |
            (Complaint.complaint_id == f"#{clean_target_id.lstrip('#')}") |
            (Complaint.complaint_id == clean_target_id.lstrip("#"))
        )
    )
    primary = res.scalars().first()

    if not primary:
        logger.warning(f"Matched complaint {matched_complaint_id} not found in database.")
        return None

    master_issue = None
    if primary.master_issue_id:
        mi_res = await db.execute(select(MasterIssue).where(MasterIssue.issue_id == primary.master_issue_id))
        master_issue = mi_res.scalars().first()

    if not master_issue:
        # Create new Master Issue
        mi_id = generate_master_issue_id()
        existing_mi = await db.execute(select(MasterIssue).where(MasterIssue.issue_id == mi_id))
        while existing_mi.scalars().first():
            mi_id = generate_master_issue_id()
            existing_mi = await db.execute(select(MasterIssue).where(MasterIssue.issue_id == mi_id))

        summary_desc = primary.description.strip()
        if len(summary_desc) > 50:
            summary_desc = summary_desc[:47] + "..."

        master_issue = MasterIssue(
            issue_id=mi_id,
            title=f"{primary.category}: {summary_desc} — {primary.location}",
            category=primary.category,
            location=primary.location,
            status="open",
            primary_complaint_id=primary.complaint_id,
            created_at=primary.created_at,
            updated_at=datetime.utcnow(),
        )
        db.add(master_issue)
        await db.flush()

        primary.master_issue_id = master_issue.issue_id
        db.add(StatusHistory(
            complaint_id=primary.complaint_id,
            status=format_status_title(primary.status),
            notes=f"Master Issue {master_issue.issue_id} created for this issue. Set as primary anchor.",
            timestamp=datetime.utcnow()
        ))

    # Link duplicate complaint
    duplicate_complaint.master_issue_id = master_issue.issue_id
    duplicate_complaint.duplicate_of = primary.complaint_id
    if not duplicate_complaint.duplicate_status or duplicate_complaint.duplicate_status == "none":
        duplicate_complaint.duplicate_status = "confirmed_duplicate"
    master_issue.updated_at = datetime.utcnow()

    note_text = action_by_note or f"Linked as duplicate of {primary.complaint_id} under Master Issue {master_issue.issue_id}."
    db.add(StatusHistory(
        complaint_id=duplicate_complaint.complaint_id,
        status=format_status_title(duplicate_complaint.status),
        notes=note_text,
        timestamp=datetime.utcnow()
    ))

    return master_issue

async def process_complaint_duplicates(
    db: AsyncSession,
    complaint: Complaint,
    simulate_ai_failure: bool = False
) -> Optional[DuplicateAnalysisResult]:
    """
    Main duplicate detection entrypoint executed upon complaint submission.
    Follows:
    New Complaint -> Save -> Find candidates -> AI semantic check -> Link / store.
    Guarantees complaint submission does not fail if AI service is unavailable.
    """
    try:
        candidates = await find_candidate_complaints(db, complaint)
        candidate_dicts = [
            {
                "complaint_id": c.complaint_id,
                "category": c.category,
                "location": c.location,
                "description": c.description,
            }
            for c in candidates
        ]

        analysis = await DuplicateDetectionAgent.analyze_candidates(
            new_complaint={
                "complaint_id": complaint.complaint_id,
                "category": complaint.category,
                "location": complaint.location,
                "description": complaint.description,
            },
            candidate_complaints=candidate_dicts,
            simulate_failure=simulate_ai_failure
        )

        conf = analysis.confidence
        high_thresh = getattr(settings, "DUPLICATE_THRESHOLD_HIGH", 0.80)
        med_thresh = getattr(settings, "DUPLICATE_THRESHOLD_MEDIUM", 0.55)

        complaint.duplicate_confidence = conf
        complaint.duplicate_reason = analysis.reason

        if conf >= high_thresh and analysis.matched_complaint_id:
            # HIGH CONFIDENCE: automatically link as duplicate
            complaint.duplicate_status = "confirmed_duplicate"
            complaint.duplicate_of = analysis.matched_complaint_id
            await link_to_master_issue(
                db,
                duplicate_complaint=complaint,
                matched_complaint_id=analysis.matched_complaint_id,
                action_by_note=f"AI Duplicate Detection: High confidence match ({int(conf*100)}%) with {analysis.matched_complaint_id}. Reason: {analysis.reason}"
            )
        elif conf >= med_thresh and analysis.matched_complaint_id:
            # MEDIUM CONFIDENCE: link under Master Issue and flag relationship
            complaint.duplicate_status = "possible_duplicate"
            complaint.duplicate_of = analysis.matched_complaint_id
            await link_to_master_issue(
                db,
                duplicate_complaint=complaint,
                matched_complaint_id=analysis.matched_complaint_id,
                action_by_note=f"AI Duplicate Detection: Flagged as duplicate of {analysis.matched_complaint_id} ({int(conf*100)}% confidence). Reason: {analysis.reason}"
            )
        else:
            # LOW CONFIDENCE: independent complaint
            complaint.duplicate_status = "none"
            complaint.duplicate_of = None

        # Store AI analysis record
        ai_record = AIAnalysis(
            complaint_id=complaint.complaint_id,
            category=complaint.category,
            priority=complaint.priority,
            confidence=conf,
            reasoning=analysis.reason,
            duplicate_of=complaint.duplicate_of,
            metadata_info={
                "is_duplicate": analysis.is_duplicate,
                "duplicate_status": complaint.duplicate_status,
                "duplicate_confidence": conf,
                "matched_complaint_id": analysis.matched_complaint_id,
                "same_location": analysis.same_location,
                "same_category": analysis.same_category,
                "master_issue_id": complaint.master_issue_id,
                "ai_source": analysis.ai_source,
            }
        )
        db.add(ai_record)
        await db.commit()
        return analysis

    except Exception as e:
        logger.error(f"Duplicate detection failed for complaint {complaint.complaint_id}: {e}", exc_info=True)
        # Requirement 8 & 14: Never block complaint submission if AI fails.
        # Log appropriately and mark duplicate analysis as pending/failed.
        complaint.duplicate_status = "error_pending"
        complaint.duplicate_reason = f"AI duplicate analysis temporarily unavailable: {str(e)}"
        try:
            db.add(StatusHistory(
                complaint_id=complaint.complaint_id,
                status=complaint.status.value if hasattr(complaint.status, "value") else str(complaint.status),
                notes="AI duplicate detection service unavailable during submission. Complaint saved normally.",
                timestamp=datetime.utcnow()
            ))
            await db.commit()
        except Exception:
            pass
        return None
