from pydantic import BaseModel
from typing import List, Literal, Union, Tuple, Optional

Point = Tuple[float, float]



class AllowExtras(BaseModel):
    class Config:
        extra = "allow"


class TriangleShape(AllowExtras):
    type: Literal["triangle"]
    points: List[Point]
    unit: Optional[str] = None
    dimension: Optional[dict] = None


class CircleShape(AllowExtras):
    type: Literal["circle"]
    center: Point
    radius: float
    unit: Optional[str] = None
    dimension: Optional[dict] = None


class RectangleShape(AllowExtras):
    type: Literal["rectangle"]
    x: float
    y: float
    width: float
    height: float
    unit: Optional[str] = None
    dimension: Optional[dict] = None


class LineShape(AllowExtras):
    type: Literal["line"]
    points: List[Point]
    unit: Optional[str] = None
    dimension: Optional[dict] = None


class EllipseShape(AllowExtras):
    type: Literal["ellipse"]
    center: Point
    rx: float
    ry: float
    unit: Optional[str] = None
    dimension: Optional[dict] = None


class PolygonShape(AllowExtras):
    type: Literal["polygon"]
    points: List[Point]
    unit: Optional[str] = None
    dimension: Optional[dict] = None


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

    class Config:
        extra = "allow"
