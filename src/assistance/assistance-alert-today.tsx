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
        className='mt-3 items-center [&>svg]:size-5'
        variant='info'
      >
        <AlertContainedIcon className='h-5 w-5 -mt-1' />
        <AlertTitle className='font-semibold tracking-[0.48px]'>
          {t('assistance.alreadyRegisteredToday')}
        </AlertTitle>
      </Alert>
    )
  }

  return null
}
