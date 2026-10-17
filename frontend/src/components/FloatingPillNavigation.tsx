import React, { useRef, useEffect, useState, startTransition } from 'react'
import { motion, type Transition } from 'framer-motion'
import type { PageRoute } from '../types'

export interface FloatingPillItem {
  id: PageRoute
  label: string
  icon?: React.ReactNode
  badge?: string
  badgeColor?: string
}

interface FloatingPillNavigationProps {
  items: FloatingPillItem[]
  activeRoute: PageRoute
  onNavigate: (route: PageRoute) => void
  backgroundColor?: string
  textColor?: string
  activeBackgroundColor?: string
  activeTextColor?: string
  padding?: number | string
  gap?: number | string
  linkPadding?: string
  transition?: Transition
  className?: string
}

/**
 * FloatingPillNavigation
 * Adapted from Framer FloatingPillNavigation component:
 * https://framer.com/m/FloatingPillNavigation-s92k8M.js@qwsogf78G8HhJg4I53jE
 *
 * Pill-shaped floating navigation with animated physics spring background
 * that shifts smoothly between active sections.
 */
export const FloatingPillNavigation: React.FC<FloatingPillNavigationProps> = ({
  items,
  activeRoute,
  onNavigate,
  backgroundColor = 'rgba(10, 17, 28, 0.85)',
  textColor = '#94a3b8',
  activeBackgroundColor = 'rgba(56, 189, 248, 0.16)',
  activeTextColor = '#ffffff',
  padding = '4px 6px',
  gap = '4px',
  linkPadding = '8px 16px',
  transition = { type: 'spring', stiffness: 750, damping: 52, mass: 0.9 },
  className = '',
}) => {
  const [internalActiveRoute, setInternalActiveRoute] = useState<PageRoute>(activeRoute)
  const navRef = useRef<HTMLElement | null>(null)
  const linkRef = useRef<HTMLDivElement | null>(null)
  const [navBorderRadius, setNavBorderRadius] = useState<number>(9999)
  const [linkBorderRadius, setLinkBorderRadius] = useState<number>(9999)

  // Sync internal state when activeRoute prop changes
  useEffect(() => {
    startTransition(() => {
      setInternalActiveRoute(activeRoute)
    })
  }, [activeRoute])

  // Calculate border radii based on heights
  useEffect(() => {
    const updateBorderRadii = () => {
      if (navRef.current) {
        const navHeight = navRef.current.offsetHeight
        setNavBorderRadius(navHeight / 2)
      }
      if (linkRef.current) {
        const linkHeight = linkRef.current.offsetHeight
        setLinkBorderRadius(linkHeight / 2)
      }
    }
    updateBorderRadii()

    const resizeObserver = new ResizeObserver(updateBorderRadii)
    if (navRef.current) resizeObserver.observe(navRef.current)
    if (linkRef.current) resizeObserver.observe(linkRef.current)
    return () => resizeObserver.disconnect()
  }, [linkPadding, items])

  const handleClick = (id: PageRoute) => {
    startTransition(() => {
      setInternalActiveRoute(id)
    })
    onNavigate(id)
  }

  return (
    <nav
      ref={navRef}
      className={`floating-pill-nav ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor,
        borderRadius: navBorderRadius,
        padding,
        gap,
        position: 'relative',
        width: 'max-content',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.18)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 12px rgba(56, 189, 248, 0.08)',
      }}
      aria-label="Floating Pill Navigation"
    >
      {items.map((item, index) => {
        const isActive = item.id === internalActiveRoute

        return (
          <div
            key={item.id}
            ref={index === 0 ? linkRef : null}
            onClick={() => handleClick(item.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick(item.id)
              }
            }}
            role="button"
            tabIndex={0}
            aria-current={isActive ? 'page' : undefined}
            className={`floating-pill-item ${isActive ? 'active' : ''}`}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: linkPadding,
              textDecoration: 'none',
              color: isActive ? activeTextColor : textColor,
              cursor: 'pointer',
              zIndex: 1,
              transition: 'color 0.25s ease',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            {/* Animated Active Background shifting with Spring Physics */}
            {isActive && (
              <motion.div
                layoutId="floatingPillActiveBg"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: activeBackgroundColor,
                  borderRadius: linkBorderRadius,
                  border: '1px solid rgba(56, 189, 248, 0.45)',
                  boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)',
                  zIndex: -1,
                }}
                transition={transition}
              />
            )}

            {/* Icon */}
            {item.icon && <span className="pill-item-icon">{item.icon}</span>}

            {/* Label */}
            <span className="pill-item-label">{item.label}</span>

            {/* Badge */}
            {item.badge && (
              <span
                className="pill-item-badge"
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: item.badgeColor ? `${item.badgeColor}66` : 'rgba(148, 163, 184, 0.3)',
                  color: item.badgeColor || '#94a3b8',
                  background: item.badgeColor ? `${item.badgeColor}18` : 'rgba(255, 255, 255, 0.05)',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                {item.badge}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
