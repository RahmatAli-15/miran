import json
from typing import Dict, Any, List
from .schemas import DrawingResponse
from .utils import incircle_from_triangle, point_near_line_distance

def safe_parse_llm_output(raw_text: str) -> Dict[str, Any]:
    text = raw_text.strip()
    # remove code fences
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

def is_circle_tangent_to_triangle(circle: Dict[str,Any], triangle_points: List[List[float]], eps: float=1e-3) -> bool:
    center = tuple(circle['center'])
    radius = float(circle['radius'])
    # check distance from center to each side equals radius (within eps)
    A,B,C = [tuple(p) for p in triangle_points]
    sides = [(A,B),(B,C),(C,A)]
    for p1,p2 in sides:
        d = point_near_line_distance(center, p1, p2)
        if abs(d - radius) > eps:
            return False
    return True

def parse_to_schema(raw_text: str) -> DrawingResponse:
    parsed = safe_parse_llm_output(raw_text)
    # If there's a triangle and either missing circle or circle not tangent, compute incircle
    shapes = parsed.get("shapes", [])
    triangle = None
    circle = None
    for s in shapes:
        if s.get("type") == "triangle":
            triangle = s
        if s.get("type") == "circle":
            circle = s
    if triangle:
        pts = triangle.get("points")
        # ensure points are floats
        pts_f = [[float(x), float(y)] for x,y in pts]
        # compute incircle
        inc_center, inc_r = incircle_from_triangle(pts_f)
        need_replace = False
        if circle is None:
            need_replace = True
        else:
            # if circle not tangent, replace
            try:
                if not is_circle_tangent_to_triangle(circle, pts_f, eps=1e-2):
                    need_replace = True
            except Exception:
                need_replace = True
        if need_replace:
            # remove existing circle if present, append new correct circle
            new_shapes = [s for s in shapes if s.get("type") != "circle"]
            new_shapes.append({"type":"circle", "center": [inc_center[0], inc_center[1]], "radius": inc_r})
            parsed["shapes"] = new_shapes
            # update meta
            parsed_meta = parsed.get("meta", {})
            parsed_meta["server_computed_incircle"] = True
            parsed["meta"] = parsed_meta

    # Validate using Pydantic schema
    return DrawingResponse.parse_obj(parsed)
