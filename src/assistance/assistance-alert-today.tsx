import AlertContainedIcon from '@/components/icons/alert-contained'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Assistance } from '@/customer/types'

export default function AssistanceToday({ assistance = [] }: { assistance?: Assistance[] }) {
  const today = new Date()

  const hasAssistanceToday = assistance.some(
    (assistance) => new Date(assistance.assistance_date).toDateString() === today.toDateString()
  )

  if (hasAssistanceToday) {
    return (
      <Alert
        className='mt-6 items-center has-[>svg]:grid-cols-[calc(var(--spacing)*6)_1fr] [&>svg]:size-6'
        variant='destructive'
      >
        <AlertContainedIcon />
        <AlertTitle className='font-secondary font-bold tracking-[0.48px]'>
          Ya se registro una asistencia el dia de hoy
        </AlertTitle>
      </Alert>
    )
  }

  return null
}
