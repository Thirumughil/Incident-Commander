import React, { useRef, useState, useLayoutEffect, useEffect, useId } from 'react'

export interface AnimatedPoint {
  x: number
  y: number
  label?: string
  color?: string
  sublabel?: string
}

export interface AnimatedPathProps {
  path?: string
  points?: AnimatedPoint[]
  viewWidth?: number
  viewHeight?: number
  lineColor?: string
  glowColor?: string
  dotColor?: string
  strokeWidth?: number
  dashLength?: number
  gapLength?: number
  dotSize?: number
  speed?: number
  trailLength?: number
  startDelay?: number
  startOnView?: boolean
  showBase?: boolean
  baseOpacity?: number
  showLabels?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * Default organic multi-stage process path:
 * Adapted from Framer AnimatedPath:
 * https://framer.com/m/AnimatedPath-zpq9rv.js@POpugJ0TBxWL4GA458rY
 */
const DEFAULT_PROCESS_PATH = `
  M 77 54
  C 132 2 244 8 297 118
  C 350 70 461 75 507 185
  C 571 124 698 136 757 271
`

const DEFAULT_POINTS: AnimatedPoint[] = [
  { x: 77, y: 54, label: 'Detect', sublabel: 'Alert Ingestion', color: '#38bdf8' },
  { x: 297, y: 118, label: 'Localize', sublabel: 'Graph Traversal', color: '#f59e0b' },
  { x: 507, y: 185, label: 'Mitigate', sublabel: 'Playbook Execution', color: '#a855f7' },
  { x: 757, y: 271, label: 'Learn', sublabel: 'FalkorDB Memory', color: '#10b981' },
]

/**
 * Horizontal stream path for headers and section dividers
 */
export const HEADER_STREAM_PATH = `
  M 30 20
  C 160 5 220 35 340 20
  C 460 5 540 35 670 20
  C 790 5 880 35 970 20
`

export const HEADER_STREAM_POINTS: AnimatedPoint[] = [
  { x: 30, y: 20, label: 'Detector', sublabel: 'Ingest', color: '#38bdf8' },
  { x: 340, y: 20, label: 'Analyzer', sublabel: 'Graph Walk', color: '#f59e0b' },
  { x: 670, y: 20, label: 'Responder', sublabel: 'Mitigate', color: '#a855f7' },
  { x: 970, y: 20, label: 'Learner', sublabel: 'Laplace Memory', color: '#10b981' },
]

/**
 * AnimatedPath
 * Adapted from Framer AnimatedPath:
 * https://framer.com/m/AnimatedPath-zpq9rv.js@POpugJ0TBxWL4GA458rY
 *
 * Renders an uninterrupted SVG curve with an animated looping light trail mask
 * and milestone pulse points representing continuous telemetry and agent workflows.
 */
export const AnimatedPath: React.FC<AnimatedPathProps> = ({
  path = DEFAULT_PROCESS_PATH,
  points = DEFAULT_POINTS,
  viewWidth = 927,
  viewHeight = 400,
  lineColor = '#38bdf8',
  glowColor = '#38bdf8',
  dotColor = '#38bdf8',
  strokeWidth = 2,
  dashLength = 8,
  gapLength = 8,
  dotSize = 12,
  speed = 130,
  trailLength = 0.35,
  startDelay = 0,
  startOnView = false,
  showBase = true,
  baseOpacity = 0.2,
  showLabels = false,
  className = '',
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const measurementPathRef = useRef<SVGPathElement | null>(null)
  const [started, setStarted] = useState<boolean>(!startOnView)
  const [pathLength, setPathLength] = useState<number>(800)

  // Generate unique class and animation names
  const rawId = useId()
  const uniqueId = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  const animationName = `animated-path-flow-${uniqueId}`
  const animationClass = `animated-path-stroke-${uniqueId}`

  // Measure path length to ensure consistent speed
  useLayoutEffect(() => {
    const el = measurementPathRef.current
    if (!el) return
    const measured = el.getTotalLength()
    if (measured > 0) {
      setPathLength(measured)
    }
  }, [path])

  // Viewport observer
  useEffect(() => {
    if (!startOnView) {
      setStarted(true)
      return
    }
    const element = containerRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStarted(entry.isIntersecting)
      },
      { threshold: 0.15 }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [startOnView])

  const animationDuration = Math.max(pathLength / Math.max(speed, 1), 0.4)
  const normalizedTrail = Math.max(0.01, Math.min(trailLength, 0.9999))
  const normalizedGap = 1 - normalizedTrail

  const animationStyles = `
    @keyframes ${animationName} {
      from {
        stroke-dashoffset: 0;
      }
      to {
        stroke-dashoffset: -1;
      }
    }

    .${animationClass} {
      animation-name: ${animationName};
      animation-duration: ${animationDuration}s;
      animation-delay: ${Math.max(startDelay, 0)}s;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
      animation-fill-mode: both;
      will-change: stroke-dashoffset;
    }

    @media (prefers-reduced-motion: reduce) {
      .${animationClass} {
        animation: none !important;
        stroke-dashoffset: 0 !important;
      }
    }
  `

  return (
    <div
      ref={containerRef}
      className={`animated-path-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'visible',
        pointerEvents: 'none',
        ...style,
      }}
      aria-hidden="true"
    >
      <style>{animationStyles}</style>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          overflow: 'visible',
        }}
      >
        {/* Hidden measurement path */}
        <path
          ref={measurementPathRef}
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={1}
          pointerEvents="none"
        />

        {/* Animated Moving Trail Mask */}
        <defs>
          <mask
            id={`moving-trail-mask-${uniqueId}`}
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
            x={-100}
            y={-100}
            width={viewWidth + 200}
            height={viewHeight + 200}
          >
            <path
              d={path}
              pathLength={1}
              fill="none"
              stroke="white"
              strokeWidth={Math.max(strokeWidth + 16, 20)}
              strokeLinecap="round"
              strokeDasharray={`${normalizedTrail} ${normalizedGap}`}
              strokeDashoffset={0}
              className={started ? animationClass : undefined}
            />
          </mask>

          {/* Radial glow filter */}
          <filter id={`glow-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Static Base Path (Dashed) */}
        {showBase && (
          <path
            d={path}
            fill="none"
            stroke={lineColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${gapLength}`}
            strokeLinecap="round"
            opacity={baseOpacity}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Active Animated Light Trail */}
        <path
          d={path}
          fill="none"
          stroke={glowColor}
          strokeWidth={strokeWidth + 1}
          strokeDasharray={`${dashLength} ${gapLength}`}
          strokeLinecap="round"
          filter={`url(#glow-${uniqueId})`}
          vectorEffect="non-scaling-stroke"
          mask={`url(#moving-trail-mask-${uniqueId})`}
          opacity={0.95}
        />

        {/* Milestone Dots & Stage Badges */}
        {points.map((point, index) => {
          const ptColor = point.color || dotColor
          return (
            <g key={`pt-${index}`} className="animated-path-milestone">
              {/* Outer Pulse Ring */}
              <circle
                cx={point.x}
                cy={point.y}
                r={dotSize}
                fill={ptColor}
                opacity={0.2}
              />
              {/* Core Milestone Dot */}
              <circle
                cx={point.x}
                cy={point.y}
                r={dotSize / 2}
                fill={ptColor}
                stroke="#060b13"
                strokeWidth={2}
              />

              {/* Optional Labels */}
              {showLabels && point.label && (
                <g>
                  <text
                    x={point.x}
                    y={point.y - 12}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize="11px"
                    fontWeight="600"
                    fontFamily="Inter, sans-serif"
                  >
                    {point.label}
                  </text>
                  {point.sublabel && (
                    <text
                      x={point.x}
                      y={point.y + 18}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9px"
                      fontWeight="500"
                      fontFamily="Inter, sans-serif"
                    >
                      {point.sublabel}
                    </text>
                  )}
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
export default AnimatedPath
