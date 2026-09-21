"""
AI Trade Categorization & Estimator Flash Summary Engine
Multi-trade keyword and regex classification for municipal building permits.
Subtrades supported:
- Electrical
- Plumbing & Mechanical / HVAC
- Roofing & Sheet Metal
- Drywall & Steel Stud
- Commercial Overhead Doors & Dock
- Glazing & Building Envelope
- Framing & Structural Timber
- Concrete & Foundations
"""

import re
from typing import Dict, List, Tuple

SUBTRADE_RULES = {
    "electrical": {
        "name": "Electrical",
        "color": "#2563EB",
        "icon": "Zap",
        "keywords": [
            r"\belectr", r"\bwiring\b", r"\bpanel\b", r"\btransformer\b", r"\b400a\b", r"\b600v\b",
            r"\blighting\b", r"\bfire alarm\b", r"\bgenerator\b", r"\bev charg", r"\bconduit\b",
            r"\bsubstation\b", r"\bswitchgear\b", r"\bled retrofit\b", r"\bpower feed\b"
        ]
    },
    "hvac_plumbing": {
        "name": "Plumbing & Mechanical / HVAC",
        "color": "#DC2626",
        "icon": "Flame",
        "keywords": [
            r"\bhvac\b", r"\bmechanical\b", r"\bplumb", r"\bboiler\b", r"\bchiller\b", r"\bheat pump\b",
            r"\brtu\b", r"\brooftop unit\b", r"\bductwork\b", r"\bventilat", r"\bair conditioning\b",
            r"\bhydronic\b", r"\bsprinkler\b", r"\bgas line\b", r"\bdrainage\b", r"\bexhaust hood\b"
        ]
    },
    "roofing": {
        "name": "Roofing & Sheet Metal",
        "color": "#16A34A",
        "icon": "Home",
        "keywords": [
            r"\broof", r"\btpo\b", r"\bsbs membrane\b", r"\bshingle", r"\bmetal roof", r"\bparapet\b",
            r"\bflashing\b", r"\bre-roof", r"\bsoffit\b", r"\bfascia\b", r"\bwaterproofing membrane\b"
        ]
    },
    "drywall_framing": {
        "name": "Drywall & Steel Stud",
        "color": "#D97706",
        "icon": "Layers",
        "keywords": [
            r"\bdrywall\b", r"\bsteel stud\b", r"\bgypsum\b", r"\bacoustic ceiling\b", r"\bt-bar\b",
            r"\btape and mud\b", r"\bpartition wall\b", r"\bbatt insulation\b", r"\btenant improvement\b",
            r"\binterior framing\b", r"\bfit-?out\b"
        ]
    },
    "commercial_doors": {
        "name": "Commercial Overhead Doors & Dock",
        "color": "#EA580C",
        "icon": "DoorOpen",
        "keywords": [
            r"\boverhead door\b", r"\broll-?up door\b", r"\bsectional door\b", r"\bdock leveler\b",
            r"\bloading dock\b", r"\bbay door\b", r"\brapid roll\b", r"\bhigh-speed door\b", r"\bwarehouse door\b"
        ]
    },
    "glazing": {
        "name": "Glazing & Building Envelope",
        "color": "#0891B2",
        "icon": "Maximize",
        "keywords": [
            r"\bglaz", r"\bcurtain wall\b", r"\bstorefront\b", r"\baluminum window\b", r"\bthermal glass\b",
            r"\bmullion\b", r"\bskylight\b", r"\bcladding\b", r"\bacm panel\b", r"\bexterior envelope\b"
        ]
    },
    "concrete": {
        "name": "Concrete & Foundations",
        "color": "#4B5563",
        "icon": "Hammer",
        "keywords": [
            r"\bconcrete\b", r"\bfoundation\b", r"\bslab-on-grade\b", r"\brebar\b", r"\btilt-?up\b",
            r"\bfooting", r"\bformwork\b", r"\bretaining wall\b", r"\bparkade slab\b", r"\bpour\b"
        ]
    },
    "framing": {
        "name": "Framing & Structural Timber",
        "color": "#9333EA",
        "icon": "Box",
        "keywords": [
            r"\bwood frame\b", r"\btimber\b", r"\btruss", r"\bclt\b", r"\bmass timber\b", r"\bstructural frame\b",
            r"\bfloor joist\b", r"\bengineered wood\b", r"\bpost and beam\b"
        ]
    }
}


def classify_permit(description: str, permit_type: str = "", work_class: str = "") -> List[Dict]:
    """
    Evaluates text against trade definitions and returns subtrade matches with confidence score.
    """
    text_corpus = f"{description} {permit_type} {work_class}".lower()
    matches = []

    for trade_key, config in SUBTRADE_RULES.items():
        score = 0.0
        matched_terms = []
        for pat in config["keywords"]:
            found = re.findall(pat, text_corpus, re.IGNORECASE)
            if found:
                score += len(found) * 0.35
                matched_terms.extend(found)

        # Baseline inference for specific permit types/classes
        if work_class.lower() in ["commercial", "industrial"]:
            if trade_key in ["electrical", "hvac_plumbing"]:
                score += 0.3
        if "tenant improvement" in text_corpus and trade_key in ["drywall_framing", "electrical", "hvac_plumbing"]:
            score += 0.4
        if "warehouse" in text_corpus and trade_key in ["commercial_doors", "concrete"]:
            score += 0.4

        if score >= 0.3:
            confidence = min(round(score, 2), 1.0)
            matches.append({
                "subtrade_key": trade_key,
                "name": config["name"],
                "color": config["color"],
                "icon": config["icon"],
                "confidence": confidence,
                "matched_terms": list(set(matched_terms))[:3]
            })

    # Sort descending by confidence
    matches.sort(key=lambda x: x["confidence"], reverse=True)
    return matches


def generate_estimator_summary(permit_number: str, address: str, work_class: str, value: float, description: str, matched_trades: List[Dict]) -> str:
    """
    Produces a concise 2-sentence plain-English project summary tailored for trade estimators.
    """
    val_formatted = f"${value:,.0f}" if value else "undisclosed value"
    primary_trades = ", ".join([t["name"] for t in matched_trades[:3]]) if matched_trades else "General Construction"
    
    # Sentence 1: Scope & Scale
    desc_cleaned = description.strip().rstrip(".")
    if len(desc_cleaned) > 110:
        desc_cleaned = desc_cleaned[:107] + "..."
    sentence1 = f"{work_class.capitalize()} permit for {address} ({val_formatted}), involving {desc_cleaned.lower()}."
    
    # Sentence 2: Trade actionability
    if matched_trades:
        sentence2 = f"Key subtrade bidding opportunities identified in {primary_trades} with immediate estimation relevance."
    else:
        sentence2 = f"General commercial scope suitable for early trade contractor outreach and site review."
        
    return f"{sentence1} {sentence2}"
