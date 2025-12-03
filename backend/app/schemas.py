from pydantic import BaseModel
from typing import List, Literal, Union, Tuple

Point = Tuple[float, float]

class TriangleShape(BaseModel):
    type: Literal["triangle"]
    points: List[Point]

class CircleShape(BaseModel):
    type: Literal["circle"]
    center: Point
    radius: float

class RectangleShape(BaseModel):
    type: Literal["rectangle"]
    x: float
    y: float
    width: float
    height: float

class LineShape(BaseModel):
    type: Literal["line"]
    points: List[Point]  # must be 2 points

class EllipseShape(BaseModel):
    type: Literal["ellipse"]
    center: Point
    rx: float
    ry: float

class PolygonShape(BaseModel):
    type: Literal["polygon"]
    points: List[Point]

Shape = Union[
    TriangleShape,
    CircleShape,
    RectangleShape,
    LineShape,
    EllipseShape,
    PolygonShape,
]

class DrawingResponse(BaseModel):
    shapes: List[Shape]
    meta: dict = {}
