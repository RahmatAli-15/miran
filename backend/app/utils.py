import math
from typing import List, Tuple

Point = Tuple[float, float]

def distance(a: Point, b: Point) -> float:
    return math.hypot(a[0]-b[0], a[1]-b[1])

def triangle_side_lengths(pts: List[Point]) -> Tuple[float,float,float]:
    # pts = [A,B,C]
    A,B,C = pts
    a = distance(B,C)  # opposite A
    b = distance(C,A)  # opposite B
    c = distance(A,B)  # opposite C
    return a,b,c

def incircle_from_triangle(pts: List[Point]) -> Tuple[Point, float]:
    """
    Compute incenter and inradius for triangle pts = [A,B,C]
    Returns ( (cx,cy), r )
    """
    A,B,C = pts
    a = distance(B,C)
    b = distance(C,A)
    c = distance(A,B)
    perimeter = a + b + c
    if perimeter == 0:
        raise ValueError("Degenerate triangle")
    # Incenter = (a*A + b*B + c*C) / (a+b+c)
    cx = (a*A[0] + b*B[0] + c*C[0]) / perimeter
    cy = (a*A[1] + b*B[1] + c*C[1]) / perimeter
    # Area using Heron or vector cross
    s = perimeter / 2.0
    # area by cross product
    area = abs( (B[0]-A[0])*(C[1]-A[1]) - (B[1]-A[1])*(C[0]-A[0]) ) / 2.0
    if s == 0:
        r = 0.0
    else:
        r = area / s
    return (round(cx, 6), round(cy, 6)), round(r, 6)

def point_near_line_distance(pt: Point, p1: Point, p2: Point) -> float:
    # distance from pt to line segment through p1-p2 (infinite line)
    x0,y0 = pt
    x1,y1 = p1
    x2,y2 = p2
    num = abs((y2-y1)*x0 - (x2-x1)*y0 + x2*y1 - y2*x1)
    den = math.hypot(y2-y1, x2-x1)
    if den == 0:
        return math.hypot(x0-x1, y0-y1)
    return num/den
