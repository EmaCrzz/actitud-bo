'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * SuccessTick — check animado con burst radial (réplica del "Success Tick" de
 * LottieFiles, sin Lottie ni dependencias de animación).
 *
 * Todo vive en unidades del viewBox (240x240, centro en 120,120), así que se ve
 * igual a 24px que a 240px. Las keyframes se generan a partir de la constante
 * TIMELINE para que las tres variantes de ciclo (`full`, `short`, `persist`)
 * compartan los mismos tiempos absolutos.
 */

// Geometría — ver ADR 20260819163000_success-tick-animation.md
const VIEW_BOX = 240
const CENTER = VIEW_BOX / 2

const RING_R = 56.2
const RING_W = 7.6
const RING_C = 2 * Math.PI * RING_R
// Grados horarios desde las 12: 30° = la 1 en punto.
const RING_START_CLOCK_DEG = 30

// Punto sobre el anillo a `deg` grados horarios desde las 12.
function ringPoint(deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180

  return [CENTER + RING_R * Math.sin(rad), CENTER - RING_R * Math.cos(rad)]
}

// El anillo es un path de dos semiarcos, no un <circle>, para poder elegir dónde
// arranca sin rotarlo: empieza a la 1 en punto y corre horario. Así, al retraer
// el extremo final en la salida, se despinta en antihorario desde arriba
// (12 → izq → abajo → der) y el último resto queda cerca de la 1.
//
// Nada de `transform` acá a propósito: rotar el anillo dependía de cómo el motor
// resuelve el `transform-origin` por default, y eso lo mandaba fuera del cuadro.
const RING_D = (() => {
  const [sx, sy] = ringPoint(RING_START_CLOCK_DEG)
  const [ex, ey] = ringPoint(RING_START_CLOCK_DEG + 180)
  const arc = `A ${RING_R} ${RING_R} 0 1 1`
  const s = `${sx.toFixed(3)} ${sy.toFixed(3)}`

  return `M ${s} ${arc} ${ex.toFixed(3)} ${ey.toFixed(3)} ${arc} ${s}`
})()

const TICK_D = 'M 91.6 131.9 L 110 143.2 L 149.4 99.9'
const TICK_W = 9.7
// Largo del path medido segmento a segmento (21.59 + 58.54).
const TICK_LEN = 80.1
// Overshoot de escala del remate del tilde.
const TICK_OVERSHOOT = 1.015

const RAY_COUNT = 16
const RAY_LEN = 6.9
const RAY_W = 2.7
const RAY_R_FROM = 65
const RAY_R_TO = 98
// Por debajo de este tamaño los rayos son sub-pixel y se leen como ruido.
const RAY_MIN_SIZE = 48

// Cada rayo se dibuja ya en su ángulo (nada de `rotate`, misma razón que el
// anillo) y viaja hacia afuera con un translate cuyo delta se pasa por custom
// properties. `translate()` no depende del `transform-origin`, así que la
// animación es idéntica en cualquier motor.
const RAYS = Array.from({ length: RAY_COUNT }, (_, i) => {
  const rad = ((i * 360) / RAY_COUNT / 180) * Math.PI
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const inner = RAY_R_FROM - RAY_LEN / 2
  const outer = RAY_R_FROM + RAY_LEN / 2
  const travel = RAY_R_TO - RAY_R_FROM

  return {
    x1: CENTER + inner * cos,
    y1: CENTER + inner * sin,
    x2: CENTER + outer * cos,
    y2: CENTER + outer * sin,
    dx: travel * cos,
    dy: travel * sin,
  }
})

// Tiempos absolutos del ciclo, en segundos desde el inicio.
const TIMELINE = {
  tickDrawStart: 0.12,
  tickDrawEnd: 0.5,
  tickSettleEnd: 0.6,
  raysStart: 0.25,
  raysEnd: 0.85,
  exitStart: 2.25,
  tickFadeEnd: 2.55,
  ringExitEnd: 2.65,
}

const EASE_DRAW = 'cubic-bezier(0.22, 1, 0.36, 1)'
const EASE_SETTLE = 'cubic-bezier(0.33, 0, 0.2, 1)'
// Rápido al salir del anillo, casi detenido al llegar al radio máximo.
const EASE_BURST = 'cubic-bezier(0.05, 0.7, 0.1, 1)'
const EASE_FADE = 'cubic-bezier(0.4, 0, 1, 1)'
const EASE_ERASE = 'cubic-bezier(0.4, 0, 0.2, 1)'

type VariantKey = 'full' | 'short' | 'persist'

const VARIANTS: Record<VariantKey, { duration: number; exit: boolean }> = {
  // Ciclo completo: salida + frame vacío antes de reiniciar.
  full: { duration: 4, exit: true },
  // Igual pero recortando el frame vacío.
  short: { duration: TIMELINE.ringExitEnd, exit: true },
  // Sin salida: se corta después del burst y el estado final queda fijo.
  persist: { duration: TIMELINE.raysEnd, exit: false },
}

const CYCLE_MS: Record<VariantKey, number> = {
  full: Math.round(VARIANTS.full.duration * 1000),
  short: Math.round(VARIANTS.short.duration * 1000),
  persist: Math.round(VARIANTS.persist.duration * 1000),
}

function buildVariantCss(key: VariantKey): string {
  const { duration, exit } = VARIANTS[key]
  const at = (t: number) => `${Math.min(100, (t / duration) * 100).toFixed(3)}%`
  const stops = (...ts: number[]) => [...new Set(ts.map(at))].join(',')
  const ms = CYCLE_MS[key]

  // El anillo aparece completo de golpe (dashoffset 0 desde el frame 0): nunca
  // hay draw-on. En la salida se retrae el extremo final hasta desaparecer.
  const ring = exit
    ? `@keyframes st-ring-${key}{
${stops(0, TIMELINE.exitStart)}{stroke-dashoffset:0;animation-timing-function:${EASE_ERASE}}
${stops(TIMELINE.ringExitEnd, duration)}{stroke-dashoffset:${RING_C.toFixed(2)}}
}`
    : `@keyframes st-ring-${key}{
${stops(0, duration)}{stroke-dashoffset:0}
}`

  // El tilde no se despinta: se dibuja por trim y sale por opacity.
  const tickFade = exit
    ? `
${at(TIMELINE.exitStart)}{opacity:1}
${at(TIMELINE.tickFadeEnd)}{opacity:0}`
    : ''

  // El frame 0 va con opacity 0 y `step-end`: con dashoffset == largo del path el
  // `stroke-linecap:round` dibujaría un punto en el arranque del tilde, y hasta
  // tickDrawStart solo debe verse el anillo.
  const tick = `@keyframes st-tick-${key}{
0.000%{stroke-dashoffset:${TICK_LEN};opacity:0;transform:scale(1);animation-timing-function:step-end}
${at(TIMELINE.tickDrawStart)}{stroke-dashoffset:${TICK_LEN};opacity:1;transform:scale(1);animation-timing-function:${EASE_DRAW}}
${at(TIMELINE.tickDrawEnd)}{stroke-dashoffset:0;transform:scale(${TICK_OVERSHOOT});animation-timing-function:${EASE_SETTLE}}
${at(TIMELINE.tickSettleEnd)}{transform:scale(1)}${tickFade}
${at(duration)}{stroke-dashoffset:0;opacity:${exit ? 0 : 1};transform:scale(1)}
}`

  // Radio y opacidad van en elementos distintos para poder darles easings
  // distintos: el radio arranca rápido y frena, la opacidad se sostiene y cae.
  const rayMove = `@keyframes st-ray-move-${key}{
${stops(0, TIMELINE.raysStart)}{transform:translate(0,0);animation-timing-function:${EASE_BURST}}
${stops(TIMELINE.raysEnd, duration)}{transform:translate(var(--st-dx),var(--st-dy))}
}`

  const rayFade = `@keyframes st-ray-fade-${key}{
0.000%{opacity:0;animation-timing-function:step-end}
${at(TIMELINE.raysStart)}{opacity:1;animation-timing-function:${EASE_FADE}}
${stops(TIMELINE.raysEnd, duration)}{opacity:0}
}`

  const rules = `.st-play-${key} .st-ring{animation:st-ring-${key} ${ms}ms linear forwards}
.st-play-${key} .st-tick{animation:st-tick-${key} ${ms}ms linear forwards}
.st-play-${key} .st-ray-g{animation:st-ray-fade-${key} ${ms}ms linear forwards}
.st-play-${key} .st-ray{animation:st-ray-move-${key} ${ms}ms linear forwards}`

  return [ring, tick, rayMove, rayFade, rules].join('\n')
}

// Estado de reposo = estado final de la animación (anillo + tilde, sin rayos).
// Así `playing={false}` y `prefers-reduced-motion` caen en el mismo render.
//
// El único `transform-origin` del componente es el del tilde, y va explícito con
// su `transform-box`. Ningún otro elemento rota: la geometría ya viene calculada
// en su ángulo y los rayos viajan con `translate()`, que no depende del origin.
const BASE_CSS = `.st-svg{display:block}
.st-svg .st-ring,.st-svg .st-tick,.st-svg .st-ray{fill:none;stroke:currentColor}
.st-svg .st-ring{stroke-width:${RING_W};stroke-dasharray:${RING_C.toFixed(2)} ${RING_C.toFixed(2)};stroke-dashoffset:0}
.st-svg .st-tick{stroke-width:${TICK_W};stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:${TICK_LEN};stroke-dashoffset:0;transform-box:view-box;transform-origin:${CENTER}px ${CENTER}px}
.st-svg .st-ray{stroke-width:${RAY_W};stroke-linecap:round}
.st-svg .st-ray-g{opacity:0}`

const LOOP_CSS = `.st-loop .st-ring,.st-loop .st-tick,.st-loop .st-ray,.st-loop .st-ray-g{animation-iteration-count:infinite}`

const REDUCED_CSS = `@media (prefers-reduced-motion:reduce){
.st-svg .st-ring,.st-svg .st-tick,.st-svg .st-ray,.st-svg .st-ray-g{animation:none}
.st-svg .st-rays{display:none}
}`

const SUCCESS_TICK_CSS = [
  BASE_CSS,
  buildVariantCss('full'),
  buildVariantCss('short'),
  buildVariantCss('persist'),
  LOOP_CSS,
  REDUCED_CSS,
].join('\n')

// React 19 deduplica los <style> hoisteados por `href` y NO reemplaza el
// contenido si el href ya está en el head. Con un href fijo, editar el CSS no se
// refleja hasta un hard reload (el Fast Refresh trae el markup nuevo pero deja el
// stylesheet viejo — combinación que ya nos hizo perder un debug). Derivando el
// href del contenido, cada versión del CSS es un recurso distinto y la
// deduplicación entre instancias se mantiene.
const CSS_HREF = `success-tick-${(() => {
  let h = 5381

  for (let i = 0; i < SUCCESS_TICK_CSS.length; i++) {
    h = ((h << 5) + h + SUCCESS_TICK_CSS.charCodeAt(i)) | 0
  }

  return (h >>> 0).toString(36)
})()}`

export interface SuccessTickProps {
  /** Lado del SVG en px. Toda la geometría escala con él. */
  size?: number
  /** Color del anillo, el tilde y los rayos. `currentColor` para heredar. */
  color?: string
  /** Repite el ciclo indefinidamente. */
  loop?: boolean
  /**
   * Dispara la animación. Al pasar de false a true reinicia desde el frame 0.
   * En false renderiza el estado final estático (anillo + tilde, sin rayos), que
   * es lo que se quiere para los ítems ya confirmados de una lista.
   */
  playing?: boolean
  /** Mantiene el frame vacío final (ciclo de 4.00s en vez de 2.65s). */
  emptyTail?: boolean
  /**
   * Si es false el ciclo se corta después del burst (0.85s) y el anillo + tilde
   * quedan fijos. Necesario cuando el check es un indicador persistente y no un
   * feedback efímero.
   */
  exit?: boolean
  /** Rayos del burst. Por default se apagan solos por debajo de 48px. */
  rays?: boolean
  /** Si se omite, el ícono se marca `aria-hidden` (decorativo). */
  label?: string
  className?: string
  onComplete?: () => void
}

export default function SuccessTick({
  size = 120,
  color = '#07AD01',
  loop = false,
  playing = true,
  emptyTail = false,
  exit = true,
  rays,
  label,
  className,
  onComplete,
}: SuccessTickProps) {
  const variant: VariantKey = !exit ? 'persist' : emptyTail ? 'full' : 'short'
  const showRays = rays ?? size >= RAY_MIN_SIZE
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    if (!playing || loop) return
    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = window.setTimeout(() => onCompleteRef.current?.(), reduced ? 0 : CYCLE_MS[variant])

    return () => window.clearTimeout(id)
  }, [playing, loop, variant])

  return (
    <>
      {/* React 19 deduplica el stylesheet por `href`, así que N instancias
          montan un solo <style> en el head. Ver CSS_HREF. */}
      <style href={CSS_HREF} precedence='default'>
        {SUCCESS_TICK_CSS}
      </style>
      <svg
        aria-hidden={label ? undefined : true}
        aria-label={label}
        className={cn('st-svg', playing && `st-play-${variant}`, loop && 'st-loop', className)}
        height={size}
        role={label ? 'img' : undefined}
        style={{ color }}
        viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}
        width={size}
      >
        <path className='st-ring' d={RING_D} />
        <path className='st-tick' d={TICK_D} />
        {showRays && (
          <g className='st-rays'>
            {RAYS.map((ray, i) => (
              <g key={i} className='st-ray-g'>
                <line
                  className='st-ray'
                  style={{ '--st-dx': `${ray.dx}px`, '--st-dy': `${ray.dy}px` } as CSSProperties}
                  x1={ray.x1}
                  x2={ray.x2}
                  y1={ray.y1}
                  y2={ray.y2}
                />
              </g>
            ))}
          </g>
        )}
      </svg>
    </>
  )
}

/**
 * El anillo del SuccessTick, solo y estático. Para los estados vacíos o pendientes
 * que conviven con un SuccessTick en la misma lista: un ícono de otra familia
 * (lucide, por ejemplo) desentona, porque acá el anillo es más fino y el tilde no
 * se sale del círculo. Misma geometría, mismo trazo, cero divergencia posible.
 */
export function SuccessTickRing({
  size = 120,
  color = 'currentColor',
  label,
  className,
}: Pick<SuccessTickProps, 'size' | 'color' | 'label' | 'className'>) {
  return (
    <>
      <style href={CSS_HREF} precedence='default'>
        {SUCCESS_TICK_CSS}
      </style>
      <svg
        aria-hidden={label ? undefined : true}
        aria-label={label}
        className={cn('st-svg', className)}
        height={size}
        role={label ? 'img' : undefined}
        style={{ color }}
        viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}
        width={size}
      >
        <path className='st-ring' d={RING_D} />
      </svg>
    </>
  )
}
