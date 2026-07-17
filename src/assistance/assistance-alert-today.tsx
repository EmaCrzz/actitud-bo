import AlertContainedIcon from '@/components/icons/alert-contained'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Assistance } from '@/customer/types'
import { useTranslations } from '@/lib/i18n/context'
import { isSameDayInAppTz } from '@/lib/timezone'

export default function AssistanceToday({ assistance = [] }: { assistance?: Assistance[] }) {
  const { t } = useTranslations()
  const today = new Date()

  const hasAssistanceToday = assistance.some((assistance) =>
    isSameDayInAppTz(assistance.assistance_date, today)
  )

  if (hasAssistanceToday) {
    return (
      <Alert
        className='mt-3 items-center has-[>svg]:grid-cols-[calc(var(--spacing)*6)_1fr] has-[>svg]:gap-x-1 [&>svg]:size-6'
        variant='destructive'
      >
        <AlertContainedIcon />
        <AlertTitle className='font-semibold tracking-[0.48px]'>
          {t('assistance.alreadyRegisteredToday')}
        </AlertTitle>
      </Alert>
    )
  }

  return null
}
