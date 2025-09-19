import { Button, type ButtonProps } from '@/components/ui/button'
import { useTranslations } from '@/lib/i18n/context'

interface Props extends ButtonProps {
  fullMembership?: boolean
}

export default function RegistryBtn({ fullMembership, ...props }: Props) {
  const { t } = useTranslations()

  return (
    <Button className='h-14 w-full' variant={fullMembership ? 'ghost' : 'default'} {...props}>
      {fullMembership ? t('assistance.registerDailyPass') : t('assistance.registerAttendance')}
    </Button>
  )
}
