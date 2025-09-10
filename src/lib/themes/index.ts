import { TENANT } from "../envs"
import { TENANTS, TenantsType } from "../tenants"
import { getTenantFontStyles } from "./fonts"


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
        '200': '#ff6398',
        '300': '#ff4284',
        '400': '#ff2976',
        '500': '#ff1168',
        '600': '#e60f5e',
        '700': '#cc0d54',
        contrast: '#fff',
      },
      secondary: {
        '200': '#66e6d3',
        '300': '#33ddc4',
        '400': '#00d4aa',
        '500': '#00c299',
        '600': '#00a085',
        '700': '#008f75',
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
            border: "rgba(255, 255, 255, 0.8)",
          }
        },
        popover: {
          background: '#322d2f',
          border: 'rgba(255, 255, 255, 0.3)',
          text: 'rgba(255, 255, 255, 0.8)',
        }
      }
    }
  },
  [TENANTS.WELLRISE]: {
    colors: {
      text: '#2C2930',
      background: '#FAFAFA',
      primary: {
        '200': '#ebe4ff',
        '300': '#ddd1ff',
        '400': '#c4afff',
        '500': '#b094ff',
        '600': '#9c6eff',
        '700': '#8a4eff',
        contrast: '#fff'
      },
      secondary: {
        '200': '#ffd4a8',
        '300': '#ffc47a',
        '400': '#ffb347',
        '500': '#ff9f1a',
        '600': '#e68a00',
        '700': '#cc7a00',
        contrast: '#fff',
      }
    }
  },
  [TENANTS.CORE]: {
    colors: {
      text: '#2C2930',
      background: '#FAFAFA',
      primary: {
        '200': '#d9ff99',
        '300': '#beff5c',
        '400': '#affe34',
        '500': '#8fe012',
        '600': '#6bb808',
        '700': '#528c0a',
        contrast: '#000'
      },
      secondary: {
        '200': '#ffb3c6',
        '300': '#ff94ae',
        '400': '#ff7b9a',
        '500': '#ff5c85',
        '600': '#e64d76',
        '700': '#cc4368',
        contrast: '#fff',
      }
    }
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
                styles[`--color-${componentName}-${styleName}-${nestedName}`] = nestedValue as string
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