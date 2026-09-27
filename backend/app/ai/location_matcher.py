import re
from typing import Tuple, Set

# Common campus abbreviations and normalizations
LOCATION_SYNONYMS = {
    r"\bblk\b": "block",
    r"\bbldg\b": "building",
    r"\brm\b": "room",
    r"\bflr\b": "floor",
    r"\blvl\b": "level",
    r"\blab\b": "laboratory",
    r"\bdept\b": "department",
    r"\bseminar\s+room\b": "seminar hall",
    r"\bconf\s+room\b": "conference room",
    r"\bwashroom\b": "restroom",
    r"\btoilet\b": "restroom",
}

# Generic structural fillers that can be omitted when comparing core locations
FILLER_WORDS = {"the", "a", "an", "at", "in", "near", "opposite", "beside", "inside", "block", "building", "wing"}

def normalize_location_text(location_str: str) -> str:
    """
    Normalizes a location string:
    - Lowercase
    - Replaces punctuation with space
    - Standardizes abbreviations and synonyms
    - Strips excess whitespace
    """
    if not location_str:
        return ""

    text = location_str.strip().lower()

    # Apply synonym and abbreviation mappings
    for pattern, replacement in LOCATION_SYNONYMS.items():
        text = re.sub(pattern, replacement, text)

    # Replace punctuation (except alphanumeric) with spaces
    text = re.sub(r"[^\w\s]", " ", text)
    
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text

def extract_location_tokens(normalized_text: str, remove_fillers: bool = False) -> Set[str]:
    """Extracts alphanumeric tokens, optionally filtering out structural filler words."""
    tokens = set(normalized_text.split())
    if remove_fillers:
        tokens = {t for t in tokens if t not in FILLER_WORDS}
    return tokens

def extract_room_or_number(text: str) -> Set[str]:
    """Finds room/floor/lab numbers like 304, 3, 4b, etc."""
    return set(re.findall(r"\b\d+[a-z]?\b", text))

def calculate_location_similarity(loc1: str, loc2: str) -> Tuple[bool, float, str]:
    """
    Compares two campus locations and returns:
    (is_match, similarity_score, reason)

    Supports:
    1. Exact match
    2. Normalized exact match (e.g. "IT Seminar Hall" vs "it seminar hall")
    3. Structural synonym / alias match (e.g. "IT Seminar Hall" vs "IT Block Seminar Hall")
    4. Room/Unit number conflict detection (e.g. "Room 304" vs "Room 305" => NO MATCH)
    5. Token overlap / Jaccard similarity
    """
    if not loc1 or not loc2:
        return False, 0.0, "Missing location data"

    raw1 = loc1.strip()
    raw2 = loc2.strip()

    # 1. Exact raw match
    if raw1.lower() == raw2.lower():
        return True, 1.0, "Exact location match"

    norm1 = normalize_location_text(raw1)
    norm2 = normalize_location_text(raw2)

    # 2. Normalized match
    if norm1 == norm2:
        return True, 1.0, "Normalized exact match"

    # 3. Check for specific conflicting numbers (e.g. Room 304 vs Room 305, or Library Room 3 vs IT Hall)
    numbers1 = extract_room_or_number(norm1)
    numbers2 = extract_room_or_number(norm2)
    if numbers1 and numbers2 and numbers1 != numbers2:
        # Different room or floor numbers within same or different block
        return False, 0.20, f"Conflicting room/number indicators: {numbers1} vs {numbers2}"

    # 4. Core tokens (with structural fillers removed for alias matching like IT Block Seminar Hall <-> IT Seminar Hall)
    core_tokens1 = extract_location_tokens(norm1, remove_fillers=True)
    core_tokens2 = extract_location_tokens(norm2, remove_fillers=True)

    if core_tokens1 and core_tokens2:
        if core_tokens1 == core_tokens2:
            return True, 0.95, f"Core campus location match ({' '.join(core_tokens1)})"

        # Check subset containment (e.g. "IT Seminar Hall" inside "IT Block Seminar Hall")
        if core_tokens1.issubset(core_tokens2) or core_tokens2.issubset(core_tokens1):
            subset_ratio = min(len(core_tokens1), len(core_tokens2)) / max(len(core_tokens1), len(core_tokens2))
            if subset_ratio >= 0.6:
                return True, round(0.85 + 0.10 * subset_ratio, 2), "Location name alias / containment match"

        # Jaccard overlap on core tokens
        intersection = core_tokens1.intersection(core_tokens2)
        union = core_tokens1.union(core_tokens2)
        jaccard = len(intersection) / len(union) if union else 0.0

        if jaccard >= 0.70:
            return True, round(jaccard, 2), f"High location token overlap ({jaccard:.0%})"
        elif jaccard >= 0.65:
            return True, round(jaccard, 2), f"Moderate location token overlap ({jaccard:.0%})"

    # 5. Full tokens (without filler removal)
    all_tokens1 = extract_location_tokens(norm1, remove_fillers=False)
    all_tokens2 = extract_location_tokens(norm2, remove_fillers=False)
    full_intersection = all_tokens1.intersection(all_tokens2)
    full_union = all_tokens1.union(all_tokens2)
    full_jaccard = len(full_intersection) / len(full_union) if full_union else 0.0

    if full_jaccard >= 0.65:
        return True, round(full_jaccard, 2), "Location token similarity"

    return False, round(full_jaccard, 2), "Different campus locations"
