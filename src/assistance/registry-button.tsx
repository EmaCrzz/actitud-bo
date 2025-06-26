import { Button, type ButtonProps } from '@/components/ui/button'

interface Props extends ButtonProps {
  fullMembership?: boolean
}

export default function RegistryBtn({ fullMembership, ...props }: Props) {
  return (
    <Button className='h-14 w-full' variant={fullMembership ? 'ghost' : 'default'} {...props}>
      {fullMembership ? 'Registrar pase diario' : 'Registrar asistencia'}
    </Button>
  )
}
