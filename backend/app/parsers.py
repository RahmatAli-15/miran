import json
import re
import math
from typing import Dict, Any, List
from .schemas import DrawingResponse
from .utils import incircle_from_triangle, point_near_line_distance

# --------------------------
# Unit detection regex
# --------------------------
UNIT_REGEX = re.compile(r"(\d+(?:\.\d+)?)\s*(cm|mm|m|inch|inches)", re.IGNORECASE)

# --------------------------
# Detect if user explicitly requests incircle
# --------------------------
INCIRCLE_KEYWORDS = [
    "incircle", "in circle", "in-circle",
    "inscribed circle", "incenter circle",
    "circle tangent to all sides",
    "draw the incircle", "add incircle"
]

def user_requested_incircle(query: str) -> bool:
    q = query.lower()
    return any(k in q for k in INCIRCLE_KEYWORDS)


# --------------------------
# Extract JSON from LLM
# --------------------------
def safe_parse_llm_output(raw_text: str) -> Dict[str, Any]:
    text = raw_text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        candidate = next((p for p in parts if p.strip().startswith("{")), text)
    else:
        candidate = text

    start = candidate.find("{")
    end = candidate.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in LLM response.")

    json_blob = candidate[start:end+1]
    return json.loads(json_blob)


# --------------------------
# Check circle tangency
# --------------------------
def is_circle_tangent_to_triangle(circle: Dict[str, Any], triangle_points: List[List[float]], eps: float = 1e-3) -> bool:
    center = tuple(circle["center"])
    radius = float(circle["radius"])
    A, B, C = [tuple(p) for p in triangle_points]
    sides = [(A, B), (B, C), (C, A)]

    for p1, p2 in sides:
        d = point_near_line_distance(center, p1, p2)
        if abs(d - radius) > eps:
            return False
    return True


# --------------------------
# MAIN PARSER (UPDATED)
# --------------------------
def parse_to_schema(raw_text: str, user_query: str = "") -> DrawingResponse:
    parsed = safe_parse_llm_output(raw_text)
    shapes = parsed.get("shapes", [])

    # ---------------------------------------------------
    # 🔹 1. Detect units from user input → default = cm
    # ---------------------------------------------------
    matches = UNIT_REGEX.findall(user_query)
    unit = matches[0][1].lower() if matches else "cm"

    parsed["meta"] = parsed.get("meta", {})
    parsed["meta"]["units"] = unit

    # ---------------------------------------------------
    # 🔹 2. Add dimension metadata
    # ---------------------------------------------------
    for shape in shapes:
        shape["unit"] = unit

        if shape.get("type") == "circle":
            r = float(shape["radius"])
            shape["dimension"] = {"radius": round(r, 2)}

        if shape.get("type") == "rectangle":
            w = float(shape["width"])
            h = float(shape["height"])
            shape["dimension"] = {"width": round(w, 2), "height": round(h, 2)}

        if shape.get("type") == "triangle":
            pts = shape["points"]

            def dist(a, b): return math.hypot(a[0] - b[0], a[1] - b[1])

            AB = dist(pts[0], pts[1])
            BC = dist(pts[1], pts[2])
            CA = dist(pts[2], pts[0])

            shape["dimension"] = {
                "sides": {
                    "AB": round(AB, 2),
                    "BC": round(BC, 2),
                    "CA": round(CA, 2)
                }
            }

    # ---------------------------------------------------
    # 🔹 3. NEW — Only compute incircle if user asked
    # ---------------------------------------------------
    if not user_requested_incircle(user_query):
        print("ℹ️ User did NOT request incircle → skipping auto-incircle")
        print("FINAL PARSED JSON:", json.dumps(parsed, indent=2))
        return DrawingResponse.parse_obj(parsed)

    # ---- If user DID request incircle ----
    print("✔️ User requested incircle → computing it...")

    triangle = next((s for s in shapes if s.get("type") == "triangle"), None)

    if triangle:
        pts_f = [[float(x), float(y)] for x, y in triangle["points"]]
        inc_center, inc_r = incircle_from_triangle(pts_f)

        # Remove existing circle if any
        shapes = [s for s in shapes if s.get("type") != "circle"]

        new_circle = {
            "type": "circle",
            "center": [inc_center[0], inc_center[1]],
            "radius": inc_r,
            "unit": unit,
            "dimension": {"radius": round(float(inc_r), 2)}
        }

        shapes.append(new_circle)
        parsed["shapes"] = shapes
        parsed["meta"]["server_computed_incircle"] = True

    print("FINAL PARSED JSON:", json.dumps(parsed, indent=2))
    return DrawingResponse.parse_obj(parsed)
