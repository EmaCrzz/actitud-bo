import { cn } from '@/lib/utils'
import {
  MEMBERSHIP_TYPE_3_DAYS,
  MEMBERSHIP_TYPE_5_DAYS,
  MEMBERSHIP_TYPE_DAILY,
  MEMBERSHIP_TYPE_VIP,
  MembershipTypes,
} from '@/membership/consts'
import { useTranslations } from '@/lib/i18n/context'

interface Porps {
  membershipType: MembershipTypes
  assistanceCount?: number
  selectedDay?: string
  isDisabled?: boolean
  handleSelectedDay?: (day: string) => void
}

export default function CustomerCounter({
  membershipType,
  assistanceCount = 1,
  selectedDay = undefined,
  isDisabled = false,
  handleSelectedDay,
}: Porps) {
  const { t } = useTranslations()
  const membershipItems: Record<MembershipTypes, number> = {
    [MEMBERSHIP_TYPE_VIP]: 5,
    [MEMBERSHIP_TYPE_5_DAYS]: 5,
    [MEMBERSHIP_TYPE_3_DAYS]: 3,
    [MEMBERSHIP_TYPE_DAILY]: 1,
  }
  const items = membershipItems[membershipType]

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
