import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // `node` y no `jsdom`: estos tests cubren lógica pura —política de cobro,
    // precios, fechas—, no componentes. Nada de lo que se testea acá toca el
    // DOM, y un entorno de browser sólo agregaría arranque.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Los e2e son de Playwright y viven en `e2e/`. Sin esto, Vitest intentaría
    // levantar los `.spec.ts` de ahí y fallaría con errores confusos.
    exclude: ['node_modules', 'e2e', '.next'],
    // Sin `globals`: cada archivo importa `describe`/`it`/`expect` de vitest.
    // Es una línea más por archivo a cambio de no necesitar tipos globales ni
    // configuración extra de ESLint.
    globals: false,
  },
})
