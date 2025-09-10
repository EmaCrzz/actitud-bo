'use client'

import { useTheme } from '@/lib/themes'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ThemeSelectorProps {
  showPreview?: boolean
  className?: string
}

export function ThemeSelector({ showPreview = false, className }: ThemeSelectorProps) {
  const { currentTheme, setTheme, availableThemes } = useTheme()

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId)
  }

  const handlePreviewTheme = (_themeId: string) => {
    // Preview functionality can be implemented later
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tema del Gimnasio</CardTitle>
          <CardDescription>
            Selecciona la paleta de colores que represente mejor tu gimnasio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Tema Activo
            </label>
            <Select value={currentTheme.id} onValueChange={handleThemeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableThemes.map((theme) => (
                  <SelectItem 
                    key={theme.id} 
                    value={theme.id}
                    onMouseEnter={() => showPreview && handlePreviewTheme(theme.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <span>{theme.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current theme info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tema Actual:</span>
              <Badge variant="secondary">{currentTheme.name}</Badge>
            </div>
            
            {currentTheme.description && (
              <p className="text-sm text-muted-foreground">
                {currentTheme.description}
              </p>
            )}

            {/* Color palette preview */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Paleta de Colores:</span>
              <div className="grid grid-cols-8 gap-2">
                <div className="space-y-1">
                  <div 
                    className="w-8 h-8 rounded border border-white/20" 
                    style={{ backgroundColor: currentTheme.colors.primary }}
                    title="Primary"
                  />
                  <span className="text-xs text-muted-foreground block">Primary</span>
                </div>
                <div className="space-y-1">
                  <div 
                    className="w-8 h-8 rounded border border-white/20" 
                    style={{ backgroundColor: currentTheme.colors.primary200 }}
                    title="Primary 200"
                  />
                  <span className="text-xs text-muted-foreground block">Light</span>
                </div>
                <div className="space-y-1">
                  <div 
                    className="w-8 h-8 rounded border border-white/20" 
                    style={{ backgroundColor: currentTheme.colors.background }}
                    title="Background"
                  />
                  <span className="text-xs text-muted-foreground block">BG</span>
                </div>
                <div className="space-y-1">
                  <div 
                    className="w-8 h-8 rounded border border-white/20" 
                    style={{ backgroundColor: currentTheme.colors.card }}
                    title="Card"
                  />
                  <span className="text-xs text-muted-foreground block">Card</span>
                </div>
                <div className="space-y-1">
                  <div 
                    className="w-8 h-8 rounded border border-white/20" 
                    style={{ backgroundColor: currentTheme.colors.input }}
                    title="Input"
                  />
                  <span className="text-xs text-muted-foreground block">Input</span>
                </div>
                <div className="space-y-1">
                  <div 
                    className="w-8 h-8 rounded border border-white/20" 
                    style={{ backgroundColor: currentTheme.colors.accent }}
                    title="Accent"
                  />
                  <span className="text-xs text-muted-foreground block">Accent</span>
                </div>
                <div className="space-y-1">
                  <div 
                    className="w-8 h-8 rounded border border-white/20" 
                    style={{ backgroundColor: currentTheme.colors.destructive }}
                    title="Destructive"
                  />
                  <span className="text-xs text-muted-foreground block">Error</span>
                </div>
                <div className="space-y-1">
                  <div 
                    className="w-8 h-8 rounded border border-white/20" 
                    style={{ backgroundColor: currentTheme.colors.membershipCard }}
                    title="Membership Card"
                  />
                  <span className="text-xs text-muted-foreground block">Member</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}