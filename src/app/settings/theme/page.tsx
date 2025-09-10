import { ThemeSelector } from '@/components/theme-selector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ThemeSettingsPage() {
  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Configuración de Tema</h1>
          <p className="text-muted-foreground">Personaliza la apariencia de tu gimnasio</p>
        </div>
      </div>

      {/* Theme Selector */}
      <ThemeSelector showPreview={true} />

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">¿Cómo funciona?</CardTitle>
          <CardDescription>
            Información sobre el sistema de temas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Temas Disponibles</h4>
            <p className="text-sm text-muted-foreground">
              Cada tema incluye una paleta completa de colores que se aplica a toda la aplicación,
              manteniendo la consistencia visual y la identidad de tu gimnasio.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Personalización por Gimnasio</h4>
            <p className="text-sm text-muted-foreground">
              Los temas se guardan localmente en tu navegador. Cada gimnasio puede tener su propia
              configuración de colores sin afectar a otros usuarios.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Aplicación Instantánea</h4>
            <p className="text-sm text-muted-foreground">
              Los cambios se aplican inmediatamente y se mantienen entre sesiones. No es necesario
              recargar la página ni realizar configuraciones adicionales.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vista Previa de Componentes</CardTitle>
          <CardDescription>
            Ejemplos de cómo se ven los elementos con el tema actual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Button Examples */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Botones</h4>
            <div className="flex gap-3 flex-wrap">
              <Button>Botón Primario</Button>
              <Button variant="secondary">Botón Secundario</Button>
              <Button variant="outline">Botón Outline</Button>
              <Button variant="ghost">Botón Ghost</Button>
              <Button variant="destructive">Botón Destructive</Button>
            </div>
          </div>

          {/* Color Swatches */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Superficie y Fondos</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-16 rounded border bg-background flex items-center justify-center text-xs">
                  Background
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded border bg-card flex items-center justify-center text-xs">
                  Card
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded border bg-input flex items-center justify-center text-xs">
                  Input
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded border bg-muted flex items-center justify-center text-xs">
                  Muted
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}