import React, { useState, useCallback, useId } from 'react'

export interface AccordionItemData {
  id?: string
  title: React.ReactNode
  badge?: React.ReactNode
  body: React.ReactNode
  accentColor?: string
  icon?: React.ReactNode
}

export interface AnimatedAccordionProps {
  items: AccordionItemData[]
  accentColor?: string
  type?: 'single' | 'multiple'
  defaultOpenIndex?: number
  titleSize?: number
  bodySize?: number
  titleColor?: string
  bodyColor?: string
  mutedColor?: string
  borderColor?: string
  rowGap?: number
  className?: string
  style?: React.CSSProperties
  onSelectIndex?: (index: number) => void
}

/**
 * Animated plus-minus morphing icon with rotating dashed track
 * Adapted from Framer AnimatedAccordion:
 * https://framer.com/m/AnimatedAccordion-yn5pTV.js@SSKBON4cpOaAJQbn2HLl
 */
function AccordionIcon({
  isOpen,
  accentColor = '#38bdf8',
  mutedColor = 'rgba(148, 163, 184, 0.6)',
}: {
  isOpen: boolean
  accentColor: string
  mutedColor: string
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {/* Outer circular dashed track rotating 180deg on toggle */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          color: isOpen ? accentColor : mutedColor,
          transition: 'transform 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55), color 300ms',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12"
          strokeDasharray="4 4"
        />
      </svg>

      {/* Morphing plus to minus pill bars */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isOpen ? 'rotate(90deg) scale(1.1)' : 'scale(1)',
          transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Horizontal bar */}
        <div
          style={{
            position: 'absolute',
            width: 12,
            height: 2,
            borderRadius: 9999,
            background: isOpen ? accentColor : mutedColor,
            transition: 'background 500ms',
          }}
        />
        {/* Vertical bar morphing out */}
        <div
          style={{
            position: 'absolute',
            height: 12,
            width: 2,
            borderRadius: 9999,
            background: isOpen ? 'transparent' : mutedColor,
            transform: isOpen ? 'rotate(90deg) scale(0)' : 'scale(1)',
            transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  )
}

function AccordionRow({
  item,
  idx,
  isOpen,
  onToggle,
  accentColor,
  titleSize,
  bodySize,
  titleColor,
  bodyColor,
  mutedColor,
  borderColor,
}: {
  item: AccordionItemData
  idx: number
  isOpen: boolean
  onToggle: () => void
  accentColor: string
  titleSize: number
  bodySize: number
  titleColor: string
  bodyColor: string
  mutedColor: string
  borderColor: string
}) {
  const [hovered, setHovered] = useState(false)
  const id = useId()
  const contentId = `acc-content-${id}-${idx}`
  const effectiveAccent = item.accentColor || accentColor

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        width: '100%',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left indicator column with connecting vertical line */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 4,
          marginRight: 14,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={contentId}
          style={{
            width: 42,
            height: 42,
            borderRadius: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isOpen ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${isOpen ? effectiveAccent : borderColor}`,
            boxShadow: isOpen ? `0 0 16px ${effectiveAccent}40` : 'none',
            transform: isOpen ? 'scale(1.08)' : hovered ? 'scale(1.04)' : 'scale(1)',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'background-color 500ms, border-color 500ms, box-shadow 500ms, transform 500ms',
            padding: 0,
            outline: 'none',
          }}
        >
          <AccordionIcon isOpen={isOpen} accentColor={effectiveAccent} mutedColor={mutedColor} />
        </button>

        {/* Animated vertical gradient connector */}
        <div
          style={{
            position: 'absolute',
            top: 42,
            bottom: -14,
            width: 2,
            background: isOpen ? `linear-gradient(to bottom, ${effectiveAccent}, transparent)` : 'transparent',
            opacity: isOpen ? 1 : 0,
            transformOrigin: 'top',
            transform: isOpen ? 'scaleY(1)' : 'scaleY(0)',
            transition: 'all 500ms',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Right Content Panel with CSS Grid 0fr -> 1fr Animation */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          transform: isOpen ? 'translateX(4px)' : hovered ? 'translateX(2px)' : 'translateX(0)',
          transition: 'transform 500ms',
        }}
      >
        {/* Row Title Header Button */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={contentId}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '14px 18px',
            borderRadius: 12,
            background: isOpen
              ? 'rgba(15, 25, 42, 0.9)'
              : hovered
                ? 'rgba(15, 25, 42, 0.7)'
                : 'rgba(10, 18, 30, 0.5)',
            border: `1px solid ${isOpen ? `${effectiveAccent}55` : borderColor}`,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'background-color 500ms, border-color 500ms, border-radius 500ms',
            outline: 'none',
            position: 'relative',
            overflow: 'hidden',
            borderBottomLeftRadius: isOpen ? 0 : 12,
            borderBottomRightRadius: isOpen ? 0 : 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {/* Subtle sweep highlight */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to right, ${effectiveAccent}25, transparent)`,
              opacity: isOpen ? 0.15 : hovered ? 0.08 : 0,
              transition: 'opacity 200ms',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            {item.icon && <span>{item.icon}</span>}
            <div style={{ fontSize: titleSize, fontWeight: 600, color: isOpen ? titleColor : mutedColor, transition: 'color 300ms', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.title}
            </div>
          </div>

          {item.badge && (
            <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
              {item.badge}
            </div>
          )}
        </button>

        {/* Animated Expandable Body */}
        <div
          id={contentId}
          role="region"
          aria-hidden={!isOpen}
          style={{
            display: 'grid',
            gridTemplateRows: isOpen ? '1fr' : '0fr',
            opacity: isOpen ? 1 : 0,
            transition: 'grid-template-rows 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                position: 'relative',
                padding: '16px 18px',
                border: `1px solid ${effectiveAccent}33`,
                borderTop: 'none',
                borderBottomLeftRadius: 12,
                borderBottomRightRadius: 12,
                background: 'rgba(8, 14, 24, 0.75)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              {/* Top border glow line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: 1,
                  background: `linear-gradient(to right, transparent, ${effectiveAccent}66, transparent)`,
                }}
                aria-hidden="true"
              />

              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  fontSize: bodySize,
                  lineHeight: 1.55,
                  color: bodyColor,
                }}
              >
                {item.body}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * AnimatedAccordion
 * Adapted from Framer AnimatedAccordion:
 * https://framer.com/m/AnimatedAccordion-yn5pTV.js@SSKBON4cpOaAJQbn2HLl
 *
 * Provides timeline-connected accordion rows with plus/minus rotation morphing,
 * glow borders, and silky CSS Grid height animation.
 */
export const AnimatedAccordion: React.FC<AnimatedAccordionProps> = ({
  items,
  accentColor = '#38bdf8',
  type = 'single',
  defaultOpenIndex = 0,
  titleSize = 13,
  bodySize = 13,
  titleColor = '#f8fafc',
  bodyColor = '#cbd5e1',
  mutedColor = '#94a3b8',
  borderColor = 'rgba(56, 189, 248, 0.16)',
  rowGap = 12,
  className = '',
  style = {},
  onSelectIndex,
}) => {
  const [openValues, setOpenValues] = useState<string[]>(() => {
    if (defaultOpenIndex < 0 || defaultOpenIndex >= items.length) return []
    return [String(defaultOpenIndex)]
  })

  const toggle = useCallback(
    (value: string, idx: number) => {
      setOpenValues((prev) => {
        const isOpen = prev.includes(value)
        if (type === 'single') {
          return isOpen ? [] : [value]
        }
        return isOpen ? prev.filter((v) => v !== value) : [...prev, value]
      })
      onSelectIndex?.(idx)
    },
    [type, onSelectIndex]
  )

  return (
    <div
      className={`animated-accordion-root ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        fontFamily: 'Inter, system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Background Vertical Timeline Connector Line */}
      <div
        style={{
          position: 'absolute',
          left: 20,
          top: 24,
          bottom: 24,
          width: 2,
          background: `linear-gradient(to bottom, transparent, ${borderColor}, transparent)`,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: rowGap }}>
        {items.map((item, idx) => {
          const value = String(idx)
          const isOpen = openValues.includes(value)
          return (
            <AccordionRow
              key={item.id || `acc-item-${idx}`}
              item={item}
              idx={idx}
              isOpen={isOpen}
              onToggle={() => toggle(value, idx)}
              accentColor={accentColor}
              titleSize={titleSize}
              bodySize={bodySize}
              titleColor={titleColor}
              bodyColor={bodyColor}
              mutedColor={mutedColor}
              borderColor={borderColor}
            />
          )
        })}
      </div>
    </div>
  )
}
export default AnimatedAccordion
