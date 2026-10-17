import React, { useState, useRef } from 'react'

export type FluidButtonVariant = 'primary' | 'amber' | 'danger' | 'success' | 'purple' | 'glass'
export type FluidButtonSize = 'sm' | 'md' | 'lg'

export interface FluidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: React.ReactNode
  icon?: React.ReactNode
  variant?: FluidButtonVariant
  size?: FluidButtonSize
  scaleOnHover?: boolean
  pulseEffect?: boolean
  scale?: number
  overlayColor?: string
  firstTextColor?: string
  secondTextColor?: string
  borderColor?: string
  glowColor?: string
  badge?: React.ReactNode
  children?: React.ReactNode
}

interface VariantTheme {
  border: string
  bg: string
  fluid: string
  firstText: string
  secondText: string
  glow: string
}

const THEMES: Record<FluidButtonVariant, VariantTheme> = {
  primary: {
    border: 'rgba(56, 189, 248, 0.45)',
    bg: 'rgba(2, 132, 199, 0.18)',
    fluid: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    firstText: '#f8fafc',
    secondText: '#030712',
    glow: 'rgba(56, 189, 248, 0.4)',
  },
  amber: {
    border: 'rgba(245, 158, 11, 0.45)',
    bg: 'rgba(245, 158, 11, 0.15)',
    fluid: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
    firstText: '#fbbf24',
    secondText: '#0f172a',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  danger: {
    border: 'rgba(239, 68, 68, 0.45)',
    bg: 'rgba(239, 68, 68, 0.15)',
    fluid: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    firstText: '#fca5a5',
    secondText: '#ffffff',
    glow: 'rgba(239, 68, 68, 0.45)',
  },
  success: {
    border: 'rgba(16, 185, 129, 0.45)',
    bg: 'rgba(16, 185, 129, 0.15)',
    fluid: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
    firstText: '#34d399',
    secondText: '#022c22',
    glow: 'rgba(16, 185, 129, 0.45)',
  },
  purple: {
    border: 'rgba(168, 85, 247, 0.45)',
    bg: 'rgba(168, 85, 247, 0.15)',
    fluid: 'linear-gradient(135deg, #7e22ce 0%, #c084fc 100%)',
    firstText: '#e9d5ff',
    secondText: '#ffffff',
    glow: 'rgba(168, 85, 247, 0.45)',
  },
  glass: {
    border: 'rgba(255, 255, 255, 0.15)',
    bg: 'rgba(255, 255, 255, 0.04)',
    fluid: 'linear-gradient(135deg, rgba(56, 189, 248, 0.4) 0%, rgba(168, 85, 247, 0.4) 100%)',
    firstText: '#cbd5e1',
    secondText: '#ffffff',
    glow: 'rgba(56, 189, 248, 0.25)',
  },
}

const SIZE_STYLES: Record<FluidButtonSize, { padding: string; fontSize: number; height: number; gap: number }> = {
  sm: { padding: '6px 14px', fontSize: 12, height: 32, gap: 6 },
  md: { padding: '8px 18px', fontSize: 13, height: 38, gap: 8 },
  lg: { padding: '12px 24px', fontSize: 14, height: 46, gap: 10 },
}

/**
 * FluidButton
 * Adapted from Framer Fluid Button:
 * https://framer.com/m/Fluid-Button-TYcP.js@Zhk4D4902uwzpqUJQTaH
 *
 * Implements:
 * - Fluid overlay that rises up and fills the pill with smooth liquid curve morphing
 * - Dual label stack (upper text scrolls up, lower text scrolls in from below)
 * - Elastic scale and pulse on hover
 * - High-contrast glassmorphism with dynamic glow
 */
export const FluidButton: React.FC<FluidButtonProps> = ({
  text,
  icon,
  variant = 'primary',
  size = 'md',
  scaleOnHover = true,
  pulseEffect = true,
  scale = 1.04,
  overlayColor,
  firstTextColor,
  secondTextColor,
  borderColor,
  glowColor,
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
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const theme = THEMES[variant] || THEMES.primary
  const sizeConfig = SIZE_STYLES[size] || SIZE_STYLES.md

  const effectiveFluid = overlayColor || theme.fluid
  const effectiveFirstText = firstTextColor || theme.firstText
  const effectiveSecondText = secondTextColor || theme.secondText
  const effectiveBorder = borderColor || theme.border
  const effectiveGlow = glowColor || theme.glow

  const contentText = text ?? children

  // Transform scale calculation
  let transformStr = 'scale(1)'
  if (!disabled) {
    if (isPressed) {
      transformStr = 'scale(0.97)'
    } else if (isHovered && scaleOnHover) {
      transformStr = `scale(${scale})`
    }
  }

  return (
    <button
      ref={buttonRef}
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
      className={`fluid-button-root ${className} ${disabled ? 'fluid-disabled' : ''}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 9999,
        padding: sizeConfig.padding,
        fontSize: sizeConfig.fontSize,
        fontWeight: 600,
        fontFamily: 'Inter, system-ui, sans-serif',
        minHeight: sizeConfig.height,
        gap: sizeConfig.gap,
        background: theme.bg,
        border: `1px solid ${effectiveBorder}`,
        boxShadow: isHovered && !disabled ? `0 0 18px ${effectiveGlow}` : 'none',
        transform: transformStr,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        overflow: 'hidden',
        userSelect: 'none',
        outline: 'none',
        textDecoration: 'none',
        transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 400ms cubic-bezier(0.4, 0, 0.2, 1), border-color 300ms',
        ...style,
      }}
      {...restProps}
    >
      {/* Fluid Rising Wave Overlay */}
      <div
        className="fluid-overlay"
        style={{
          position: 'absolute',
          left: '-15%',
          right: '-15%',
          bottom: '-140%',
          height: '240%',
          background: effectiveFluid,
          borderRadius: isHovered && !disabled ? '0%' : '50% 50% 0 0',
          transform: isHovered && !disabled ? 'translateY(-68%)' : 'translateY(0%)',
          transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1), border-radius 500ms cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      {/* Button Content Cluster (Foreground) */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: sizeConfig.gap,
          pointerEvents: 'none',
        }}
      >
        {/* Leading Icon with Smooth Tilt / Shift */}
        {icon && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isHovered && !disabled ? 'translateY(-1px) scale(1.08)' : 'scale(1)',
              transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
              color: isHovered && !disabled ? effectiveSecondText : effectiveFirstText,
            }}
          >
            {icon}
          </span>
        )}

        {/* Dual Text Label Stack (Framer sliding motion) */}
        {contentText && (
          <div
            className="fluid-label-stack-container"
            style={{
              position: 'relative',
              overflow: 'hidden',
              height: sizeConfig.fontSize * 1.3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
            }}
          >
            {/* Upper text that slides up and out */}
            <div
              className="fluid-upper-text"
              style={{
                height: sizeConfig.fontSize * 1.3,
                display: 'flex',
                alignItems: 'center',
                color: effectiveFirstText,
                transform: isHovered && !disabled ? 'translateY(-100%)' : 'translateY(0%)',
                transition: 'transform 450ms cubic-bezier(0.4, 0, 0.2, 1)',
                whiteSpace: 'nowrap',
              }}
            >
              {contentText}
            </div>

            {/* Lower text that slides up into place */}
            <div
              className="fluid-lower-text"
              style={{
                height: sizeConfig.fontSize * 1.3,
                display: 'flex',
                alignItems: 'center',
                color: effectiveSecondText,
                transform: isHovered && !disabled ? 'translateY(-100%)' : 'translateY(0%)',
                transition: 'transform 450ms cubic-bezier(0.4, 0, 0.2, 1)',
                whiteSpace: 'nowrap',
                fontWeight: 700,
              }}
            >
              {contentText}
            </div>
          </div>
        )}

        {/* Optional trailing badge */}
        {badge && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              background: isHovered && !disabled ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.12)',
              color: isHovered && !disabled ? effectiveSecondText : effectiveFirstText,
              transition: 'all 300ms',
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </button>
  )
}

export default FluidButton
