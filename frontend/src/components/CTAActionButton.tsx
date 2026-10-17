import React, { useState } from 'react'

export type CTAActionButtonVariant = 'primary' | 'amber' | 'danger' | 'success' | 'purple' | 'glass'
export type CTAActionButtonSize = 'sm' | 'md' | 'lg'

export interface CTAActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: React.ReactNode
  button?: React.ReactNode // alias from Framer prop "button"
  icon?: React.ReactNode
  showArrow?: boolean
  variant?: CTAActionButtonVariant
  size?: CTAActionButtonSize
  badge?: React.ReactNode
  children?: React.ReactNode
}

interface CTATheme {
  bg: string
  border: string
  textColor: string
  podBg: string
  podColor: string
  podBorder: string
  glow: string
}

const THEMES: Record<CTAActionButtonVariant, CTATheme> = {
  primary: {
    bg: 'rgba(10, 20, 36, 0.85)',
    border: 'rgba(56, 189, 248, 0.35)',
    textColor: '#f8fafc',
    podBg: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    podColor: '#030712',
    podBorder: 'rgba(56, 189, 248, 0.6)',
    glow: 'rgba(56, 189, 248, 0.35)',
  },
  amber: {
    bg: 'rgba(26, 18, 9, 0.85)',
    border: 'rgba(245, 158, 11, 0.35)',
    textColor: '#fef3c7',
    podBg: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
    podColor: '#0f172a',
    podBorder: 'rgba(245, 158, 11, 0.6)',
    glow: 'rgba(245, 158, 11, 0.35)',
  },
  danger: {
    bg: 'rgba(28, 11, 14, 0.85)',
    border: 'rgba(239, 68, 68, 0.35)',
    textColor: '#fee2e2',
    podBg: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    podColor: '#ffffff',
    podBorder: 'rgba(239, 68, 68, 0.6)',
    glow: 'rgba(239, 68, 68, 0.35)',
  },
  success: {
    bg: 'rgba(6, 24, 18, 0.85)',
    border: 'rgba(16, 185, 129, 0.35)',
    textColor: '#d1fae5',
    podBg: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
    podColor: '#022c22',
    podBorder: 'rgba(16, 185, 129, 0.6)',
    glow: 'rgba(16, 185, 129, 0.35)',
  },
  purple: {
    bg: 'rgba(22, 13, 33, 0.85)',
    border: 'rgba(168, 85, 247, 0.35)',
    textColor: '#f3e8ff',
    podBg: 'linear-gradient(135deg, #7e22ce 0%, #c084fc 100%)',
    podColor: '#ffffff',
    podBorder: 'rgba(168, 85, 247, 0.6)',
    glow: 'rgba(168, 85, 247, 0.35)',
  },
  glass: {
    bg: 'rgba(15, 23, 42, 0.65)',
    border: 'rgba(255, 255, 255, 0.12)',
    textColor: '#cbd5e1',
    podBg: 'rgba(255, 255, 255, 0.1)',
    podColor: '#38bdf8',
    podBorder: 'rgba(255, 255, 255, 0.15)',
    glow: 'rgba(56, 189, 248, 0.2)',
  },
}

const SIZE_CONFIGS: Record<CTAActionButtonSize, {
  height: number
  padding: string
  fontSize: number
  podSize: number
  iconSize: number
  gap: number
}> = {
  sm: {
    height: 32,
    padding: '4px 4px 4px 10px',
    fontSize: 12,
    podSize: 24,
    iconSize: 11,
    gap: 8,
  },
  md: {
    height: 40,
    padding: '5px 5px 5px 14px',
    fontSize: 13,
    podSize: 30,
    iconSize: 13,
    gap: 10,
  },
  lg: {
    height: 52,
    padding: '6px 6px 6px 16px',
    fontSize: 15,
    podSize: 40,
    iconSize: 16,
    gap: 14,
  },
}

/**
 * CTA Action Button
 * Adapted from Framer CTA Action Button:
 * https://framer.com/m/CTA-Action-Button-1k1d0J.js@161lnzmJC2Cg4voEQm40
 *
 * Implements:
 * - Asymmetrical pill shape (inner text on left, signature circular action pod on right)
 * - Multi-stop smooth layered drop shadows
 * - Action pod with -45deg arrow rotation on hover via spring physics
 * - Expandable tactile hover states with luminous border glows
 */
export const CTAActionButton: React.FC<CTAActionButtonProps> = ({
  text,
  button,
  icon,
  showArrow = true,
  variant = 'primary',
  size = 'md',
  badge,
  children,
  className = '',
  style = {},
  disabled = false,
  onClick,
  type = 'button',
  ...restProps
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  const theme = THEMES[variant] || THEMES.primary
  const config = SIZE_CONFIGS[size] || SIZE_CONFIGS.md
  const label = text ?? button ?? children

  // Transform calculation: spring scale and subtle press feedback
  let transformStr = 'scale(1)'
  if (!disabled) {
    if (isPressed) {
      transformStr = 'scale(0.97)'
    } else if (isHovered) {
      transformStr = 'scale(1.03)'
    }
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsPressed(false)
      }}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      className={`cta-action-button-root ${className} ${disabled ? 'cta-disabled' : ''}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: config.height,
        minWidth: 'max-content',
        padding: config.padding,
        gap: config.gap,
        borderRadius: 33,
        background: theme.bg,
        border: `1px solid ${isHovered && !disabled ? theme.podBorder : theme.border}`,
        boxShadow: isHovered && !disabled
          ? `0 0 20px ${theme.glow}, 0px 4px 12px rgba(0, 0, 0, 0.4)`
          : '0px 1px 2px rgba(0, 0, 0, 0.25), 0px 3px 8px rgba(0, 0, 0, 0.3)',
        color: theme.textColor,
        fontSize: config.fontSize,
        fontWeight: 600,
        fontFamily: '"Space Grotesk", "Clash Grotesk", Inter, system-ui, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
        outline: 'none',
        textDecoration: 'none',
        transform: transformStr,
        transition: 'transform 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275), border-color 250ms',
        ...style,
      }}
      {...restProps}
    >
      {/* Leading Label & Optional Leading Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingLeft: label ? 2 : 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          zIndex: 1,
        }}
      >
        {label && (
          <span
            style={{
              transform: isHovered && !disabled ? 'translateX(2px)' : 'translateX(0)',
              transition: 'transform 250ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          >
            {label}
          </span>
        )}
        {badge && (
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Signature Circular Action Pod from Framer */}
      <div
        className="cta-action-pod"
        style={{
          width: config.podSize,
          height: config.podSize,
          borderRadius: 9999,
          background: theme.podBg,
          color: theme.podColor,
          border: `1px solid ${theme.podBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: isHovered && !disabled
            ? `0 0 12px ${theme.glow}, 0 2px 6px rgba(0, 0, 0, 0.35)`
            : '0 1px 3px rgba(0, 0, 0, 0.3)',
          transform: isHovered && !disabled ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 350ms cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 350ms',
        }}
      >
        {icon ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isHovered && !disabled ? 'rotate(-45deg)' : 'rotate(0deg)',
              transition: 'transform 450ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          >
            {icon}
          </div>
        ) : showArrow ? (
          /* Framer signature arrow rotating -45deg on hover */
          <svg
            viewBox="0 0 14 14"
            style={{
              width: config.iconSize,
              height: config.iconSize,
              fill: 'currentColor',
              transform: isHovered && !disabled ? 'rotate(-45deg)' : 'rotate(0deg)',
              transition: 'transform 450ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            aria-hidden="true"
          >
            <path d="M 10.653 7.875 L 0 7.875 L 0 6.125 L 10.653 6.125 L 5.753 1.225 L 7 0 L 14 7 L 7 14 L 5.753 12.775 Z" />
          </svg>
        ) : null}
      </div>
    </button>
  )
}

export default CTAActionButton
