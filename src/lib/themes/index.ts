import { TENANT } from '../envs'
import { TENANTS, TenantsType } from '../tenants'
import { getTenantFontStyles } from './fonts'

export type ComponentThemeColors = {
  background?: string
  border?: string
  text?: string
  placeholder?: string
  label?: string
  hover?: {
    background: string
    border: string
  }
}

export type ThemeColors = {
  primary: Record<string, string>
  secondary: Record<string, string>
  background: string
  text: string
  components?: Record<string, ComponentThemeColors>
}

export type TenantTheme = {
  colors: ThemeColors
}

export const tenantThemes: Record<string, TenantTheme> = {
  [TENANTS.ACTITUD]: {
    colors: {
      text: '#ffffff',
      background: '#260210',
      primary: {
        '300': '#FFBDD3',
        '400': '#FF6398',
        '500': '#FF1168',
        '600': '#B52056',
        '700': '#9D0058',
        '800': '#6A2F45',
        '900': '#4D2331',
        contrast: '#fff',
      },
      secondary: {
        '300': '#DAE8E0',
        '400': '#DAD7E0',
        '500': '#DAD7D8',
        '600': '#8F878A',
        '700': '#6A5F63',
        '800': '#3C3839',
        '900': '#322D2F',
        contrast: '#fff',
      },
      components: {
        input: {
          background: '#322d2f',
          border: 'rgba(255, 255, 255, 0.3)',
          text: '#fff',
          placeholder: 'rgba(255, 255, 255, 0.3)',
          label: 'rgba(255, 255, 255, 0.3)',
          hover: {
            background: '#3c3839',
            border: 'rgba(255, 255, 255, 0.8)',
          },
        },
        popover: {
          background: '#322d2f',
          border: 'rgba(255, 255, 255, 0.3)',
          text: 'rgba(255, 255, 255, 0.8)',
        },
      },
    },
  },
  [TENANTS.WELLRISE]: {
    colors: {
      text: '#2C2930',
      background: '#FAFAFA',
      primary: {
        '300': '#ebe4ff',
        '200': '#ddd1ff',
        '400': '#c4afff',
        '500': '#b094ff',
        '600': '#9c6eff',
        '700': '#8a4eff',
        '800': '#8a4eff',
        '900': '#8a4eff',
        contrast: '#fff',
      },
      secondary: {
        '300': '#ffd4a8',
        '400': '#ffc47a',
        '500': '#ffb347',
        '600': '#ff9f1a',
        '700': '#e68a00',
        '800': '#cc7a00',
        '900': '#cc7a00',
        contrast: '#fff',
      },
    },
  },
  [TENANTS.CORE]: {
    colors: {
      text: '#2C2930',
      background: '#FAFAFA',
      primary: {
        '300': '#d9ff99',
        '400': '#beff5c',
        '500': '#affe34',
        '600': '#8fe012',
        '700': '#6bb808',
        '800': '#528c0a',
        '900': '#528c0a',
        contrast: '#000',
      },
      secondary: {
        '300': '#ffb3c6',
        '400': '#ff94ae',
        '500': '#ff7b9a',
        '600': '#ff5c85',
        '700': '#e64d76',
        '800': '#cc4368',
        '900': '#cc4368',
        contrast: '#fff',
      },
    },
  },
}

export const getTenantTheme = (tenant: TenantsType): TenantTheme => {
  return tenantThemes[tenant] || tenantThemes[TENANTS.ACTITUD]
}

const theme = getTenantTheme(TENANT as TenantsType)

export const generateThemeStyles = () => {
  const styles: Record<string, string> = {}

  // Add font styles first
  const fontStyles = getTenantFontStyles(TENANT as TenantsType)

  Object.assign(styles, fontStyles)

  Object.entries(theme.colors).forEach(([colorName, colorValue]) => {
    if (colorName === 'text' || colorName === 'background' || colorName === 'border') {
      styles[`--color-${colorName}`] = colorValue as string

      return
    }

    if (colorName === 'components' && typeof colorValue === 'object' && colorValue !== null) {
      Object.entries(colorValue).forEach(([componentName, componentStyles]) => {
        if (typeof componentStyles === 'object' && componentStyles !== null) {
          Object.entries(componentStyles).forEach(([styleName, styleValue]) => {
            if (typeof styleValue === 'object' && styleValue !== null) {
              Object.entries(styleValue).forEach(([nestedName, nestedValue]) => {
                styles[`--color-${componentName}-${styleName}-${nestedName}`] =
                  nestedValue as string
              })
            } else if (typeof styleValue === 'string') {
              styles[`--color-${componentName}-${styleName}`] = styleValue
            }
          })
        }
      })

      return
    }

    if (typeof colorValue === 'object' && colorValue !== null) {
      Object.entries(colorValue).forEach(([shade, value]) => {
        styles[`--color-${colorName}-${shade}`] = value as string
      })
    }
  })

  return styles
}
