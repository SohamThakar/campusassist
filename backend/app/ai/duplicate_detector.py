import re
import json
import logging
from typing import List, Dict, Any, Optional, Union, Tuple
from pydantic import BaseModel

from app.config import settings
from app.ai.location_matcher import calculate_location_similarity, normalize_location_text

logger = logging.getLogger("campus_ai.duplicate_detector")

class DuplicateAnalysisResult(BaseModel):
    is_duplicate: Union[bool, str] # True, False, or "possible"
    confidence: float # 0.0 to 1.0
    matched_complaint_id: Optional[str] = None
    reason: str
    same_location: bool
    same_category: bool
    ai_source: str = "ai_agent" # "gemini", "semantic_engine", or "rule_engine"

# Common equipment / physical subject terms
SUBJECT_SYNONYMS = {
    "fan": {"fan", "ceiling fan", "exhaust fan", "table fan"},
    "light": {"light", "lights", "lamp", "bulb", "tube", "tubelight", "led", "fixture"},
    "water cooler": {"cooler", "water cooler", "water dispenser", "drinking water"},
    "ac": {"ac", "air conditioner", "air conditioning", "hvac", "cooling"},
    "tap": {"tap", "faucet", "pipe", "drain", "sink", "washbasin"},
    "switch": {"switch", "switchboard", "socket", "plug", "outlet", "wire", "wiring"},
    "door": {"door", "lock", "handle", "hinge"},
    "projector": {"projector", "screen", "display"},
    "floor": {"floor", "flooring", "tile", "tiles", "ground"},
}

FAULT_SYNONYMS = {
    "not_working": {
        "not working", "stopped working", "broken", "faulty", "dead", "damaged", 
        "out of order", "malfunctioning", "isn't working", "does not work", 
        "problem", "problems", "some problems", "some problem", "issue", "issues", 
        "defect", "defective", "trouble", "bad", "not properly", "not working properly"
    },
    "flickering": {"flickering", "flicker", "blinking", "sparking", "sparks", "dimming"},
    "leaking": {"leaking", "leak", "dripping", "drip", "overflowing", "spill", "water dripping"},
    "noisy": {"noisy", "noise", "sound", "vibration", "rattling", "buzzing"},
    "dirty": {"dirty", "stained", "trash", "garbage", "waste", "cleaning needed", "unclean"},
    "loose": {"loose", "hanging", "detached", "unfixed"},
}

def extract_subjects_and_faults(text: str) -> Tuple[set, set]:
    """Identifies canonical physical subjects and fault conditions mentioned in text."""
    lower_text = text.lower()
    found_subjects = set()
    found_faults = set()

    for canonical, synonyms in SUBJECT_SYNONYMS.items():
        for syn in synonyms:
            if re.search(rf"\b{re.escape(syn)}\b", lower_text):
                found_subjects.add(canonical)
                break

    for canonical, synonyms in FAULT_SYNONYMS.items():
        for syn in synonyms:
            if re.search(rf"\b{re.escape(syn)}\b", lower_text):
                found_faults.add(canonical)
                break

    return found_subjects, found_faults

class SemanticComparator:
    """
    Intelligent heuristic semantic analyzer.
    Evaluates physical problem descriptions, categories, and campus locations.
    Acts as an accurate local engine and resilient fallback when Gemini API is offline/unavailable.
    """

    @classmethod
    def compare(
        cls,
        new_complaint: Dict[str, Any],
        candidate: Dict[str, Any]
    ) -> DuplicateAnalysisResult:
        new_cat = (new_complaint.get("category") or "").strip().lower()
        cand_cat = (candidate.get("category") or "").strip().lower()
        same_category = (new_cat == cand_cat) and bool(new_cat)

        new_loc = new_complaint.get("location") or ""
        cand_loc = candidate.get("location") or ""
        same_location, loc_similarity, loc_reason = calculate_location_similarity(new_loc, cand_loc)

        cand_id = candidate.get("complaint_id")

        # RULE 1: Different category -> Not duplicate
        if not same_category:
            return DuplicateAnalysisResult(
                is_duplicate=False,
                confidence=0.08,
                matched_complaint_id=None,
                reason=f"Different categories: '{new_complaint.get('category')}' vs '{candidate.get('category')}'.",
                same_location=same_location,
                same_category=False,
                ai_source="semantic_engine"
            )

        # RULE 2: Different location -> Not duplicate (unless strong campus-wide evidence)
        if not same_location:
            return DuplicateAnalysisResult(
                is_duplicate=False,
                confidence=0.15,
                matched_complaint_id=None,
                reason=f"Different locations: '{new_loc}' vs '{cand_loc}'. Normally separate maintenance issues.",
                same_location=False,
                same_category=True,
                ai_source="semantic_engine"
            )

        # RULE 3: Same category and same location -> Analyze physical problem description
        new_desc = (new_complaint.get("description") or "").strip()
        cand_desc = (candidate.get("description") or "").strip()

        new_subs, new_faults = extract_subjects_and_faults(new_desc)
        cand_subs, cand_faults = extract_subjects_and_faults(cand_desc)

        # Token set comparison (normalized)
        stop_words = {"the", "a", "an", "is", "are", "in", "at", "on", "near", "has", "have", "it", "to", "for", "of", "and"}
        tokens_new = {t for t in re.findall(r"\w+", new_desc.lower()) if t not in stop_words}
        tokens_cand = {t for t in re.findall(r"\w+", cand_desc.lower()) if t not in stop_words}

        token_overlap = len(tokens_new.intersection(tokens_cand)) / len(tokens_new.union(tokens_cand)) if (tokens_new and tokens_cand) else 0.0

        # Scenario A: Clear Subject & Fault Match (e.g. fan + not working)
        common_subjects = new_subs.intersection(cand_subs)
        common_faults = new_faults.intersection(cand_faults)

        if common_subjects and (common_faults or token_overlap >= 0.35):
            subject_name = list(common_subjects)[0]
            confidence = round(min(0.95, 0.86 + 0.10 * loc_similarity), 2)
            return DuplicateAnalysisResult(
                is_duplicate=True,
                confidence=confidence,
                matched_complaint_id=cand_id,
                reason=f"Both complaints describe the same issue regarding the {subject_name} at {new_loc}.",
                same_location=True,
                same_category=True,
                ai_source="semantic_engine"
            )

        # Scenario B: Same location and category, but clearly different physical subjects/problems (e.g. fan vs lights)
        if new_subs and cand_subs and not common_subjects:
            return DuplicateAnalysisResult(
                is_duplicate=False,
                confidence=0.12,
                matched_complaint_id=None,
                reason=f"The complaints describe different problems in the same location ({', '.join(new_subs)} vs {', '.join(cand_subs)}).",
                same_location=True,
                same_category=True,
                ai_source="semantic_engine"
            )

        # Scenario C: Same location, same subject, but differing faults (e.g. fan making noise vs fan not spinning)
        if common_subjects and not common_faults:
            confidence = 0.68
            return DuplicateAnalysisResult(
                is_duplicate="possible",
                confidence=confidence,
                matched_complaint_id=cand_id,
                reason=f"Both complaints concern the {list(common_subjects)[0]} at {new_loc}, but describe different fault symptoms.",
                same_location=True,
                same_category=True,
                ai_source="semantic_engine"
            )

        # Scenario D: High token overlap without keyword library
        if token_overlap >= 0.50:
            confidence = round(0.82 + 0.10 * token_overlap, 2)
            return DuplicateAnalysisResult(
                is_duplicate=True,
                confidence=confidence,
                matched_complaint_id=cand_id,
                reason=f"Both complaints describe identical maintenance issues at {new_loc}.",
                same_location=True,
                same_category=True,
                ai_source="semantic_engine"
            )

        # Scenario E: Moderate similarity (Medium confidence, requires review)
        if token_overlap >= 0.20 or (new_faults and cand_faults and common_faults):
            confidence = 0.65
            return DuplicateAnalysisResult(
                is_duplicate="possible",
                confidence=confidence,
                matched_complaint_id=cand_id,
                reason=f"Both complaints concern related {new_complaint.get('category')} issues in the same location, but specific problem details differ or need verification.",
                same_location=True,
                same_category=True,
                ai_source="semantic_engine"
            )

        # Scenario F: Same location, same category, but different issue
        return DuplicateAnalysisResult(
            is_duplicate=False,
            confidence=0.20,
            matched_complaint_id=None,
            reason="Both complaints are in the same location and category, but describe different physical issues.",
            same_location=True,
            same_category=True,
            ai_source="semantic_engine"
        )


class DuplicateDetectionAgent:
    """
    AI Agent responsible for duplicate complaint analysis.
    Uses Google Gemini when configured, and falls back seamlessly to the SemanticComparator.
    """

    @classmethod
    async def analyze_candidates(
        cls,
        new_complaint: Dict[str, Any],
        candidate_complaints: List[Dict[str, Any]],
        simulate_failure: bool = False
    ) -> DuplicateAnalysisResult:
        """
        Analyzes a new complaint against candidate complaints.
        Returns a structured DuplicateAnalysisResult.
        """
        # Test simulation hook: check if failure should be simulated
        if simulate_failure or getattr(settings, "SIMULATE_AI_FAILURE", False):
            raise RuntimeError("Simulated AI service connection failure (API timeout / 503 Service Unavailable)")

        if not candidate_complaints:
            return DuplicateAnalysisResult(
                is_duplicate=False,
                confidence=0.0,
                matched_complaint_id=None,
                reason="No active or recent candidate complaints found in similar category or location.",
                same_location=False,
                same_category=False,
                ai_source="rule_engine"
            )

        # If Gemini API key is available, attempt Gemini inference
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip() and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
            try:
                gemini_result = await cls._call_gemini(new_complaint, candidate_complaints)
                if gemini_result:
                    return gemini_result
            except Exception as e:
                logger.warning(f"Gemini API duplicate analysis failed, falling back to SemanticComparator: {e}")

        # Fallback to local SemanticComparator
        best_result = None
        for candidate in candidate_complaints:
            res = SemanticComparator.compare(new_complaint, candidate)
            if best_result is None or res.confidence > best_result.confidence:
                best_result = res

        return best_result or DuplicateAnalysisResult(
            is_duplicate=False,
            confidence=0.0,
            matched_complaint_id=None,
            reason="No duplicate issues identified among candidates.",
            same_location=False,
            same_category=False,
            ai_source="semantic_engine"
        )

    @classmethod
    async def _call_gemini(
        cls,
        new_complaint: Dict[str, Any],
        candidate_complaints: List[Dict[str, Any]]
    ) -> Optional[DuplicateAnalysisResult]:
        """Calls Google Gemini model with strict JSON schema instructions."""
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        candidates_formatted = []
        for c in candidate_complaints:
            candidates_formatted.append({
                "complaint_id": c.get("complaint_id"),
                "category": c.get("category"),
                "location": c.get("location"),
                "description": c.get("description"),
            })

        system_instruction = (
            "You are an expert facility management AI duplicate detector for a university campus. "
            "Your job is to compare a NEW complaint against existing CANDIDATE complaints to determine "
            "if any candidate describes the SAME physical underlying problem/breakdown. "
            "CRITICAL RULES:\n"
            "1. Same category and same/normalized location + same physical issue => is_duplicate: true (confidence >= 0.85).\n"
            "2. Same location + different problem => is_duplicate: false (confidence < 0.30).\n"
            "3. Different location + same problem => is_duplicate: false (confidence < 0.30).\n"
            "4. Uncertain / related but not identical => is_duplicate: 'possible' (confidence 0.50-0.75).\n"
            "5. You MUST return ONLY valid JSON matching this exact structure without markdown or explanation:\n"
            "{\n"
            '  "is_duplicate": true | "possible" | false,\n'
            '  "confidence": 0.91,\n'
            '  "matched_complaint_id": "#REQ-1001" or null,\n'
            '  "reason": "Both complaints describe the same non-functioning ceiling fan in the IT seminar hall.",\n'
            '  "same_location": true,\n'
            '  "same_category": true\n'
            "}"
        )

        user_content = json.dumps({
            "new_complaint": {
                "category": new_complaint.get("category"),
                "location": new_complaint.get("location"),
                "description": new_complaint.get("description"),
            },
            "candidate_complaints": candidates_formatted
        }, indent=2)

        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[user_content],
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.1,
                response_mime_type="application/json"
            )
        )

        if not response or not response.text:
            return None

        # Clean JSON in case of backticks
        clean_text = response.text.strip()
        if clean_text.startswith("```"):
            clean_text = re.sub(r"^```[a-z]*\s*", "", clean_text)
            clean_text = re.sub(r"\s*```$", "", clean_text)

        parsed = json.loads(clean_text)
        return DuplicateAnalysisResult(
            is_duplicate=parsed.get("is_duplicate", False),
            confidence=float(parsed.get("confidence", 0.0)),
            matched_complaint_id=parsed.get("matched_complaint_id"),
            reason=parsed.get("reason", "AI duplicate analysis completed."),
            same_location=bool(parsed.get("same_location", False)),
            same_category=bool(parsed.get("same_category", False)),
            ai_source="gemini"
        )
