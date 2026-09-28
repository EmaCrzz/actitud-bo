import { cn } from '@/lib/utils'
import { DEFAULT_WEEKLY_SLOTS, getWeeklySlots } from '@/membership/catalog'
import { useTranslations } from '@/lib/i18n/context'

interface Porps {
  /**
   * Clave del plan. `string` y no `MembershipTypes` desde la Fase 10: los
   * planes creados desde la UI no están en esa unión.
   */
  membershipType: string
  /** Cupo semanal del plan, cuando el caller lo tiene a mano. */
  weeklyQuota?: number | null
  assistanceCount?: number
  selectedDay?: string
  isDisabled?: boolean
  handleSelectedDay?: (day: string) => void
}

export default function CustomerCounter({
  membershipType,
  weeklyQuota,
  assistanceCount = 1,
  selectedDay = undefined,
  isDisabled = false,
  handleSelectedDay,
}: Porps) {
  const { t } = useTranslations()
  // Antes esto era un `Record<MembershipTypes, number>` declarado acá adentro,
  // duplicando `SLOTS_BY_TYPE`. Para un tipo fuera del mapa devolvía
  // `undefined`, y `Array.from({ length: undefined })` da `[]`: cero casilleros
  // en pantalla, sin error. Ahora el faltante es explícito.
  const items = getWeeklySlots(membershipType, weeklyQuota) ?? DEFAULT_WEEKLY_SLOTS

  return (
    <>
      <p className='text-lg mt-6 font-secondary tracking-[0.72px]'>
        {t('assistance.weeklyAssistances')}
      </p>
      <hr className='mt-2 mb-4 border-primary' />
      <div className='flex gap-4 sm:gap-6 items-center'>
        {Array.from({ length: items }).map((_, index) => {
          const isChecked = index < assistanceCount || index + 1 === Number(selectedDay)
          const enabled = assistanceCount + 1 === index + 1 && !isDisabled

          return (
            <span
              key={index}
              className={cn(
                'size-[43px] sm:size-[53px] rounded-full flex items-center justify-center transition-colors',
                isChecked
                  ? enabled
                    ? 'bg-primary text-white hover:cursor-pointer border border-white'
                    : 'bg-primary text-white hover:cursor-not-allowed'
                  : enabled
                    ? 'bg-white text-background hover:cursor-pointer hover:bg-white/90 border border-primary'
                    : 'bg-white text-background hover:cursor-not-allowed border border-primary'
              )}
              onClick={() => {
                if (!enabled) return
                handleSelectedDay?.(String(index + 1))
              }}
            >
              <span className='font-medium text-lg sm:text-[22px]'>{index + 1}</span>
            </span>
          )
        })}
      </div>
    </>
  )
}
