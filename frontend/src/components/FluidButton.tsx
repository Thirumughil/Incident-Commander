import React from 'react'
import { CTAActionButton, type CTAActionButtonProps } from './CTAActionButton'

export type FluidButtonVariant = 'primary' | 'amber' | 'danger' | 'success' | 'purple' | 'glass'
export type FluidButtonSize = 'sm' | 'md' | 'lg'

export type FluidButtonProps = CTAActionButtonProps

/**
 * FluidButton (Legacy alias pointing to Framer CTA Action Button)
 * https://framer.com/m/CTA-Action-Button-1k1d0J.js@161lnzmJC2Cg4voEQm40
 */
export const FluidButton: React.FC<FluidButtonProps> = (props) => {
  return <CTAActionButton {...props} />
}

export default FluidButton
