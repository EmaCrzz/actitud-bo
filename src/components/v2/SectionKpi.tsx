/**
 * Un KPI del encabezado de una sección con montos (Gastos, Ventas). Va dentro
 * de un `<dl>`.
 *
 * Nació privado en la sección Gastos (Fase 11) y subió acá cuando Ventas lo
 * necesitó igual — la regla de extracción del ADR de la fase 1: se comparte
 * cuando hay dos consumidores reales.
 *
 * **La tipografía de mobile es la mitad que la de desktop, y los labels
 * envuelven en vez de truncarse.** Los montos reales del gimnasio son de 6 y 7
 * cifras —"$ 3.253.827"— y a `text-2xl` en tres columnas no entraban: el
 * número salía cortado como "$ 3.253…" y los labels como "Total de ga…". Un
 * KPI ilegible no informa nada. La maqueta se ve bien porque usa importes de
 * 7 caracteres a 389px de ancho; con los datos de verdad no alcanza.
 *
 * `tabular-nums` alinea los dígitos entre las tres columnas, que si no bailan.
 */
export default function SectionKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className='min-w-0'>
      <dt className='text-muted-foreground text-[11px] leading-tight md:text-sm'>{label}</dt>
      <dd className='mt-1 text-base font-semibold tabular-nums tracking-tight md:text-3xl'>
        {value}
      </dd>
    </div>
  )
}
