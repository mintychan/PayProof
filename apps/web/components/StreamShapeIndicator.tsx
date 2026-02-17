"use client";

interface StreamShapeIndicatorProps {
  streamType: "linear" | "cliff" | "vesting";
  cliffEnd?: number;
  endTime?: number;
  currentTime: number;
}

/**
 * Small inline SVG showing the payout curve shape of a stream.
 *
 * - "linear": diagonal line from bottom-left to top-right
 * - "cliff": flat then vertical jump at cliff point then diagonal
 * - "vesting": stepped increases for vesting schedules
 *
 * A vertical "now" marker shows the current time position.
 */
export default function StreamShapeIndicator({
  streamType,
  cliffEnd,
  endTime,
  currentTime,
}: StreamShapeIndicatorProps) {
  const width = 200;
  const height = 60;
  const padding = { top: 6, right: 8, bottom: 6, left: 8 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Determine the start (left edge) as the minimum relevant time
  const startTime = cliffEnd
    ? Math.min(cliffEnd - plotW, currentTime - plotW)
    : currentTime - plotW;
  const effectiveEnd = endTime ?? currentTime + plotW;
  const duration = Math.max(effectiveEnd - startTime, 1);

  // Map a time to an x coordinate
  const timeToX = (t: number) =>
    padding.left + ((t - startTime) / duration) * plotW;

  // "now" marker x position, clamped within the plot area
  const nowX = Math.min(
    Math.max(timeToX(currentTime), padding.left),
    padding.left + plotW
  );

  // Build the curve path
  const buildCurvePath = (): string => {
    const x0 = padding.left;
    const y0 = padding.top + plotH; // bottom-left (0 value)
    const x1 = padding.left + plotW;
    const y1 = padding.top; // top-right (max value)

    switch (streamType) {
      case "linear":
        return `M ${x0} ${y0} L ${x1} ${y1}`;

      case "cliff": {
        const cliffX = cliffEnd
          ? timeToX(cliffEnd)
          : x0 + plotW * 0.3; // default 30% if no cliff time
        const cliffY = y0 - plotH * 0.4; // jump to 40% of max
        return [
          `M ${x0} ${y0}`,
          `L ${cliffX} ${y0}`, // flat line to cliff
          `L ${cliffX} ${cliffY}`, // vertical jump
          `L ${x1} ${y1}`, // diagonal to top-right
        ].join(" ");
      }

      case "vesting": {
        const steps = 5;
        const stepW = plotW / steps;
        const stepH = plotH / steps;
        const segments: string[] = [`M ${x0} ${y0}`];
        for (let i = 0; i < steps; i++) {
          const sx = x0 + stepW * (i + 1);
          const sy = y0 - stepH * i;
          const nextY = y0 - stepH * (i + 1);
          segments.push(`L ${sx} ${sy}`); // horizontal to step edge
          segments.push(`L ${sx} ${nextY}`); // vertical rise
        }
        return segments.join(" ");
      }

      default:
        return `M ${x0} ${y0} L ${x1} ${y1}`;
    }
  };

  const curvePath = buildCurvePath();

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block"
      aria-label={`Stream shape: ${streamType}`}
    >
      {/* Subtle grid lines */}
      <line
        x1={padding.left}
        y1={padding.top + plotH}
        x2={padding.left + plotW}
        y2={padding.top + plotH}
        stroke="rgba(148,163,184,0.1)"
        strokeWidth={1}
      />
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left + plotW}
        y2={padding.top}
        stroke="rgba(148,163,184,0.1)"
        strokeWidth={1}
      />

      {/* Curve */}
      <path
        d={curvePath}
        fill="none"
        stroke="url(#shapeGradient)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* "Now" marker */}
      <line
        x1={nowX}
        y1={padding.top - 2}
        x2={nowX}
        y2={padding.top + plotH + 2}
        stroke="#34d399"
        strokeWidth={1.5}
        strokeDasharray="3 2"
      />
      <circle cx={nowX} cy={padding.top - 2} r={2.5} fill="#34d399" />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="shapeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
    </svg>
  );
}
