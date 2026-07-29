interface Props {
  title: string
  subtitle?: string
}

export default function CardHeader({ title, subtitle }: Props) {
  return (
    <div className='border-b border-primary400 pb-2 mb-4'>
      <h3 className='text-primary400 text-sm font-semibold'>{title}</h3>
      {subtitle && <p className='text-[11px] text-muted-foreground mt-0.5'>{subtitle}</p>}
    </div>
  )
}
