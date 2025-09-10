import type { NextFont } from 'next/dist/compiled/@next/font'

import { Noto_Sans, Montserrat, Inter, Playfair_Display, Poppins } from 'next/font/google'
import { TENANTS, TenantsType } from '@/lib/tenants'
import localFont from 'next/font/local'

type FontWithVariable = NextFont & { variable: string }

export interface TenantFontConfig {
  primary: FontWithVariable
  headline?: FontWithVariable
}

export const unbounded = localFont({
  src: [
    {
      path: '../../../public/fonts/unbounded/light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/unbounded/medium.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/unbounded/semiBold.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/unbounded/bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/unbounded/extraBold.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--font-unbounded',
  display: 'swap',
})

// Configure fonts with proper weights and subsets
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700'],
  variable: '--font-roboto'
})

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700'],
  variable: '--font-noto-sans'
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700'],
  variable: '--font-montserrat'
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700'],
  variable: '--font-inter'
})

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-playfair-display'
})

// System font fallback
export const systemFont: FontWithVariable = {
  className: 'font-system',
  style: { fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
  variable: '--font-system'
} as FontWithVariable

export const defaultFont = systemFont

// Dual font configuration for each tenant
export const fontMap: Record<TenantsType, TenantFontConfig> = {
  [TENANTS.ACTITUD]: {
    primary: poppins as FontWithVariable,
    headline: unbounded as FontWithVariable
  },
  [TENANTS.CORE]: {
    primary: montserrat as FontWithVariable,
    headline: inter as FontWithVariable
  },
  [TENANTS.WELLRISE]: {
    primary: notoSans as FontWithVariable,
    headline: playfairDisplay as FontWithVariable
  },
}

export function getTenantFontConfig(tenant: TenantsType): TenantFontConfig {
  return fontMap[tenant] || { primary: defaultFont }
}

// Legacy function for backward compatibility
export function getTenantFont(tenant: TenantsType): FontWithVariable {
  const config = getTenantFontConfig(tenant)

  return config.primary
}

export function getTenantHeadlineFont(tenant: TenantsType): FontWithVariable {
  const config = getTenantFontConfig(tenant)

  return config.headline || config.primary
}

// Get all font variables for a tenant
export function getTenantFontVariables(tenant: TenantsType): string {
  const config = getTenantFontConfig(tenant)
  const variables = [config.primary.variable]

  if (config.headline && config.headline !== config.primary) {
    variables.push(config.headline.variable)
  }

  return variables.join(' ')
}

// Get inline styles for font variables that need to be in CSS
export function getTenantFontStyles(tenant: TenantsType): Record<string, string> {
  const config = getTenantFontConfig(tenant)
  const styles: Record<string, string> = {}

  // Map primary font variable to --font-family-primary
  styles['--font-family-primary'] = config.primary.style?.fontFamily || 'system-ui, sans-serif'

  // Map headline font variable to --font-family-headline if it exists
  if (config.headline) {
    styles['--font-family-headline'] = config.headline.style?.fontFamily || config.primary.style?.fontFamily || 'system-ui, sans-serif'
  }

  return styles
}
