import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'

type SubtitleTone = 'success' | 'warning' | 'danger' | 'muted'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  subtitleTone?: SubtitleTone
  href?: string
}

const toneClass: Record<SubtitleTone, string> = {
  success: 'text-[var(--color-feedback-success)]',
  warning: 'text-[var(--color-feedback-warning)]',
  danger: 'text-[var(--color-feedback-error)]',
  muted: 'text-muted-foreground',
}

export default function MetricCard({
  title,
  value,
  subtitle,
  subtitleTone = 'muted',
  href,
}: MetricCardProps) {
  const content = (
    <Card className='relative gap-2 p-5 bg-white rounded-lg'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-muted-foreground'>{title}</span>
        {href && <ChevronRight className='size-4 text-muted-foreground' />}
      </div>
      <div className='text-3xl font-semibold tracking-tight'>{value}</div>
      {subtitle && <div className={`text-xs ${toneClass[subtitleTone]}`}>{subtitle}</div>}
    </Card>
  )

  return href ? (
    <Link className='block' href={href}>
      {content}
    </Link>
  ) : (
    content
  )
}
