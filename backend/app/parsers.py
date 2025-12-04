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
    if matches:
        unit = matches[0][1].lower()
    else:
        unit = "cm"

    parsed["meta"] = parsed.get("meta", {})
    parsed["meta"]["units"] = unit

    # ---------------------------------------------------
    # 🔹 2. Add dimension metadata to shapes
    # ---------------------------------------------------
    for shape in shapes:
        shape["unit"] = unit

        if shape.get("type") == "circle":
            r = float(shape["radius"])
            shape["dimension"] = {"radius": round(r, 2)}

        if shape.get("type") == "rectangle":
            w = float(shape["width"])
            h = float(shape["height"])
            shape["dimension"] = {
                "width": round(w, 2),
                "height": round(h, 2)
            }

        if shape.get("type") == "triangle":
            pts = shape["points"]
            def dist(p, q): return math.hypot(p[0] - q[0], p[1] - q[1])
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
    # 🔹 3. Existing incircle correction (unchanged)
    # ---------------------------------------------------
    triangle = None
    circle = None

    for s in shapes:
        if s.get("type") == "triangle":
            triangle = s
        if s.get("type") == "circle":
            circle = s

    if triangle:
        pts = triangle.get("points")
        pts_f = [[float(x), float(y)] for x, y in pts]

        inc_center, inc_r = incircle_from_triangle(pts_f)

        need_replace = False
        if circle is None:
            need_replace = True
        else:
            try:
                if not is_circle_tangent_to_triangle(circle, pts_f, eps=1e-2):
                    need_replace = True
            except:
                need_replace = True

        if need_replace:
            new_shapes = [s for s in shapes if s.get("type") != "circle"]

            new_circle = {
                "type": "circle",
                "center": [inc_center[0], inc_center[1]],
                "radius": inc_r,
                "unit": unit,
                "dimension": {"radius": round(float(inc_r), 2)}
            }

            new_shapes.append(new_circle)
            parsed["shapes"] = new_shapes

            parsed["meta"]["server_computed_incircle"] = True

    print("FINAL PARSED JSON:", json.dumps(parsed, indent=2))
    return DrawingResponse.parse_obj(parsed)

