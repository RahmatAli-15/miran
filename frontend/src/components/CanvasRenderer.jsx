import React, { useEffect, useState } from "react";


export default function CanvasRenderer({ drawing, width = 720, height = 480 }) {
  if (!drawing || !drawing.shapes) return null;

  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    setRenderKey((prev) => prev + 1);
  }, [drawing]);

  let xs = [],
    ys = [];

  // Collect bounds
  drawing.shapes.forEach((s) => {
    if (["triangle", "polygon", "line"].includes(s.type)) {
      s.points.forEach(([x, y]) => {
        xs.push(x);
        ys.push(y);
      });
    }
    if (s.type === "circle") {
      xs.push(s.center[0] - s.radius, s.center[0] + s.radius);
      ys.push(s.center[1] - s.radius, s.center[1] + s.radius);
    }
    if (s.type === "rectangle") {
      xs.push(s.x, s.x + s.width);
      ys.push(s.y, s.y + s.height);
    }
    if (s.type === "ellipse") {
      xs.push(s.center[0] - s.rx, s.center[0] + s.rx);
      ys.push(s.center[1] - s.ry, s.center[1] + s.ry);
    }
  });

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const domainW = maxX - minX || 1;
  const domainH = maxY - minY || 1;

  const pad = 0.15 * Math.max(domainW, domainH);
  const paddedW = domainW + pad * 2;
  const paddedH = domainH + pad * 2;

  const scale = Math.min(width / paddedW, height / paddedH);

  const offsetX = (width - domainW * scale) / 2;
  const offsetY = (height - domainH * scale) / 2;

  const toSvg = ([x, y]) => [
    (x - minX) * scale + offsetX,
    height - ((y - minY) * scale + offsetY),
  ];

  // ----------------------------------------------------
  //  DIMENSION LINE DRAWER 
  // ----------------------------------------------------
  const renderDimension = (x1, y1, x2, y2, text) => (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="black"
        strokeWidth={1}
        markerStart="url(#arrow)"
        markerEnd="url(#arrow)"
      />

      <text
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2 - 5}
        fontSize="12"
        fill="black"
        textAnchor="middle"
      >
        {text}
      </text>
    </g>
  );

  return (
    <svg
      key={renderKey}
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="
        rounded-lg border bg-white dark:bg-gray-900 shadow-lg 
        transition-all duration-300 
        animate-[fadeIn_0.25s_ease-out]
      "
    >
      {/* 🔹 Arrow marker for dimension lines */}
      <defs>
        <marker
          id="arrow"
          markerWidth="10"
          markerHeight="10"
          refX="4"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L6,3 z" fill="black" />
        </marker>
      </defs>

      {/* ---------------------------------------
            SHAPES RENDERING (unchanged)
      ---------------------------------------- */}
      {drawing.shapes.map((s, idx) => {
        const key = `${s.type}-${idx}-${renderKey}`;

        if (s.type === "triangle" || s.type === "polygon") {
          const pts = s.points.map((p) => toSvg(p).join(",")).join(" ");
          return (
            <polygon
              key={key}
              points={pts}
              fill="rgba(59,130,246,0.10)"
              stroke="rgba(59,130,246,1)"
              strokeWidth={2.2}
            />
          );
        }

        if (s.type === "line") {
          const [a, b] = s.points.map(toSvg);
          return (
            <line
              key={key}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke="black"
              strokeWidth={2}
            />
          );
        }

        if (s.type === "circle") {
          const [cx, cy] = toSvg(s.center);
          const r = s.radius * scale;
          return (
            <circle
              key={key}
              cx={cx}
              cy={cy}
              r={r}
              fill="rgba(34,197,94,0.15)"
              stroke="rgba(34,197,94,1)"
              strokeWidth={2}
            />
          );
        }

        if (s.type === "rectangle") {
          const [tx, ty] = toSvg([s.x, s.y]);
          return (
            <rect
              key={key}
              x={tx}
              y={ty - s.height * scale}
              width={s.width * scale}
              height={s.height * scale}
              fill="rgba(168,85,247,0.10)"
              stroke="rgba(168,85,247,1)"
              strokeWidth={2}
            />
          );
        }

        if (s.type === "ellipse") {
          const [cx, cy] = toSvg(s.center);
          return (
            <ellipse
              key={key}
              cx={cx}
              cy={cy}
              rx={s.rx * scale}
              ry={s.ry * scale}
              fill="rgba(239,68,68,0.12)"
              stroke="rgba(239,68,68,1)"
              strokeWidth={2}
            />
          );
        }

        return null;
      })}

      {/* ---------------------------------------
            DIMENSION LINES (Simple Style)
      ---------------------------------------- */}
      {drawing.shapes.map((s, idx) => {
        if (!s.dimension) return null;

        const unit = s.unit || "cm";

        // ---------------- Rectangle ----------------
        if (s.type === "rectangle") {
          const [tx, ty] = toSvg([s.x, s.y]);

          const widthPx = s.width * scale;
          const heightPx = s.height * scale;

          // Width dimension under rectangle
          const wLine = renderDimension(
            tx,
            ty + 20,
            tx + widthPx,
            ty + 20,
            `${s.dimension.width} ${unit}`
          );

          // Height dimension left of rectangle
          const hLine = renderDimension(
            tx - 20,
            ty,
            tx - 20,
            ty - heightPx,
            `${s.dimension.height} ${unit}`
          );

          return (
            <g key={`dim-${idx}`}>
              {wLine}
              {hLine}
            </g>
          );
        }

        // ---------------- Circle ----------------
        if (s.type === "circle") {
          const [cx, cy] = toSvg(s.center);
          const r = s.radius * scale;

          return (
            <g key={`dim-${idx}`}>
              {renderDimension(cx, cy, cx + r, cy, `${s.dimension.radius} ${unit}`)}
            </g>
          );
        }

        // ---------------- Triangle ----------------
        if (s.type === "triangle") {
          const pts = s.points.map(toSvg);
          const { AB, BC, CA } = s.dimension.sides;

          return (
            <g key={`dim-${idx}`}>
              {renderDimension(
                pts[0][0],
                pts[0][1],
                pts[1][0],
                pts[1][1],
                `${AB} ${unit}`
              )}
              {renderDimension(
                pts[1][0],
                pts[1][1],
                pts[2][0],
                pts[2][1],
                `${BC} ${unit}`
              )}
              {renderDimension(
                pts[2][0],
                pts[2][1],
                pts[0][0],
                pts[0][1],
                `${CA} ${unit}`
              )}
            </g>
          );
        }

        return null;
      })}
    </svg>
  );
}
