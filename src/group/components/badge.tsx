import Link from 'next/link'
import { ChevronRight, UsersRound } from 'lucide-react'
import { CUSTOMER_GROUPS } from '@/consts/routes'
import { CustomerGroupWithCount } from '@/group/types'

interface Props {
  groups: CustomerGroupWithCount[]
  title: string
  membersLabel: (count: number) => string
  fromPath?: string
}

// Badge del grupo familiar en la ficha del cliente. Renderiza sólo si hay
// al menos un grupo activo; muestra el primero (hoy sólo puede haber uno
// por el UNIQUE(group_id, customer_id) parcial de la migración). Si mañana
// se permite pertenecer a múltiples grupos, iterar acá.
export default function GroupBadge({ groups, title, membersLabel, fromPath }: Props) {
  if (groups.length === 0) return null
  const group = groups[0]
  // ?from se propaga al detalle del grupo para que el back vuelva al perfil
  // del cliente en vez de al listado (default).
  const href = fromPath
    ? `${CUSTOMER_GROUPS}/${group.id}?from=${encodeURIComponent(fromPath)}`
    : `${CUSTOMER_GROUPS}/${group.id}`

  return (
    <section className='grid gap-y-2'>
      <span className='text-sm font-semibold text-white'>{title}</span>
      <Link
        className='flex items-center gap-3 rounded-lg border border-input-border bg-input-background px-4 py-3 transition-colors hover:bg-input-hover-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        href={href}
      >
        <UsersRound className='size-6 text-primary200 shrink-0' />
        <div className='grid flex-1'>
          <span className='text-sm font-semibold text-white'>{group.name}</span>
          <span className='text-xs text-primary'>{membersLabel(group.active_members_count)}</span>
        </div>
        <ChevronRight className='size-5 text-white/60' />
      </Link>
    </section>
  )
}
