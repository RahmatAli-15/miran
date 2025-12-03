import React, { useEffect, useState } from "react";

/**
 * Premium Canvas Renderer (Enhanced for undo/redo + smooth transitions)
 * Supports:
 * triangle, polygon, line, circle, rectangle, ellipse
 */
export default function CanvasRenderer({ drawing, width = 720, height = 480 }) {
  if (!drawing || !drawing.shapes) return null;

  const [renderKey, setRenderKey] = useState(0);

  // 🔥 Trigger a fade-in animation whenever the drawing changes
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [drawing]);

  let xs = [], ys = [];

  // Collect bounds
  drawing.shapes.forEach(s => {
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
    height - ((y - minY) * scale + offsetY)
  ];

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
      {drawing.shapes.map((s, idx) => {
        const uniqueKey = `${s.type}-${idx}-${renderKey}`;

        // ---------- Triangle / Polygon ----------
        if (s.type === "triangle" || s.type === "polygon") {
          const pts = s.points.map(p => toSvg(p).join(",")).join(" ");
          return (
            <polygon
              key={uniqueKey}
              points={pts}
              fill="rgba(59,130,246,0.10)"
              stroke="rgba(59,130,246,1)"
              strokeWidth={2.2}
              className="transition-all duration-300"
            />
          );
        }

        // ---------- Line ----------
        if (s.type === "line") {
          const [a, b] = s.points.map(toSvg);
          return (
            <line
              key={uniqueKey}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke="rgba(0,0,0,0.85)"
              strokeWidth={2.5}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          );
        }

        // ---------- Circle ----------
        if (s.type === "circle") {
          const [cx, cy] = toSvg(s.center);
          const r = s.radius * scale;
          return (
            <circle
              key={uniqueKey}
              cx={cx}
              cy={cy}
              r={r}
              fill="rgba(34,197,94,0.15)"
              stroke="rgba(34,197,94,0.9)"
              strokeWidth={2.4}
              className="transition-all duration-300"
            />
          );
        }

        // ---------- Rectangle ----------
        if (s.type === "rectangle") {
          const [tx, ty] = toSvg([s.x, s.y]);
          return (
            <rect
              key={uniqueKey}
              x={tx}
              y={ty - s.height * scale}
              width={s.width * scale}
              height={s.height * scale}
              fill="rgba(168,85,247,0.10)"
              stroke="rgba(168,85,247,1)"
              strokeWidth={2.2}
              className="transition-all duration-300"
            />
          );
        }

        // ---------- Ellipse ----------
        if (s.type === "ellipse") {
          const [cx, cy] = toSvg(s.center);
          return (
            <ellipse
              key={uniqueKey}
              cx={cx}
              cy={cy}
              rx={s.rx * scale}
              ry={s.ry * scale}
              fill="rgba(239,68,68,0.12)"
              stroke="rgba(239,68,68,1)"
              strokeWidth={2.3}
              className="transition-all duration-300"
            />
          );
        }

        return null;
      })}
    </svg>
  );
}
