'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { fetchCustomerModalData, createAssistance } from '@/assistance/api/client'
import type { CustomerModalData } from '@/assistance/api/client'
import { useTranslations } from '@/lib/i18n/context'
import type { Customer } from '@/customer/types'
import { isSameDayInAppTz, isExpiredInAppTz, APP_TIMEZONE } from '@/lib/timezone'
import { MembershipTranslation, SLOTS_BY_TYPE } from '@/membership/consts'
import { CUSTOMER } from '@/consts/routes'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/format-person'
import { formatDayLabelInAppTz, formatTimeInAppTz } from '@/lib/format-date'
import { buildWeekSlots } from '@/assistance/utils'
import type { WeekAssistance, WeekSlot } from '@/assistance/utils'
import SuccessTick, { SuccessTickRing } from '@/components/SuccessTick'
import AlertContainedIcon from '@/components/icons/alert-contained'

// El modal permanece abierto este tiempo después de confirmar para que el
// usuario vea la animación antes de que se cierre.
const CLOSE_DELAY_MS = 2000

// El anillo del SuccessTick ocupa el 50% de su viewBox, así que para llenar un
// slot de 20px (size-5) como lo haría un ícono normal el SVG va a 36px y se
// centra en absoluto — sin afectar el layout de la fila.
const SLOT_ICON_SIZE = 36
const SLOT_ICON_POSITION = 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'

// El ícono del aviso sí ocupa layout propio, así que va al tamaño que se ve.
const NOTICE_ICON_SIZE = 40

interface AssistanceModalProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AssistanceModal({ customer, open, onOpenChange }: AssistanceModalProps) {
  const { t } = useTranslations()
  const router = useRouter()
  const [modalData, setModalData] = useState<CustomerModalData | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // ISO UTC del registro optimista: se setea al confirmar para actualizar los
  // slots antes de que el modal se cierre.
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !customer) {
      setModalData(null)
      setConfirmedAt(null)

      return
    }
    let cancelled = false

    setLoadingData(true)
    fetchCustomerModalData(customer.id).then((data) => {
      if (!cancelled) {
        setModalData(data)
        setLoadingData(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, customer])

  const handleConfirm = async () => {
    if (!customer) return
    setSubmitting(true)
    const { error } = await createAssistance({ customer_id: customer.id })

    setSubmitting(false)
    if (error?.code) {
      toast.error(t('assistance.errorRegistering'), { description: error.message })

      return
    }

    const now = new Date().toISOString()

    setConfirmedAt(now)
    toast.success(t('assistance.successRegistered'))

    setTimeout(() => {
      onOpenChange(false)
      router.refresh()
    }, CLOSE_DELAY_MS)
  }

  const slotsCount =
    modalData?.membership?.type && modalData.membership.type in SLOTS_BY_TYPE
      ? SLOTS_BY_TYPE[modalData.membership.type]
      : 5

  // Merge optimista: si el usuario acaba de confirmar, añadimos su asistencia
  // localmente para que el slot reaccione sin esperar el refresh del servidor.
  const allAssistances = useMemo(() => {
    const base = modalData?.weeklyAssistances ?? []

    if (!confirmedAt) return base
    const alreadyToday = base.some((a) =>
      isSameDayInAppTz(a.assistance_date, new Date(confirmedAt))
    )

    return alreadyToday ? base : [...base, { assistance_date: confirmedAt }]
  }, [modalData, confirmedAt])

  const weekSlots = buildWeekSlots(slotsCount, allAssistances)

  const hasAssistanceToday = allAssistances.some((a) =>
    isSameDayInAppTz(a.assistance_date, new Date())
  )

  // Deliberadamente se deriva de `modalData` y no de `allAssistances`: el aviso
  // es "cuando volvés a buscar al cliente ya estaba registrado". Si saliera del
  // merge optimista aparecería de golpe junto a la animación del check, pisando
  // el feedback de la confirmación que se acaba de hacer.
  const registeredEarlierToday =
    modalData?.weeklyAssistances.find((a) => isSameDayInAppTz(a.assistance_date, new Date())) ??
    null

  const membershipIsActive =
    modalData?.membership != null && !isExpiredInAppTz(modalData.membership.expiration_date)

  // Vencida ≠ sin membresía: el aviso de renovación solo aplica al cliente que
  // tuvo una y se le venció. La asistencia se registra igual — el aviso informa,
  // no bloquea.
  const membershipIsExpired = modalData?.membership != null && !membershipIsActive

  const membershipLabel = modalData?.membership
    ? t(MembershipTranslation[modalData.membership.type])
    : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className='flex flex-col !p-4 gap-0 w-full sm:max-w-[520px]'
        data-v2='true'
        showCloseButton={false}
      >
        {/* Header */}
        <div className='flex items-center justify-between border-b pb-4'>
          <div className='flex items-center gap-3'>
            <div className='size-10 rounded-full bg-muted flex items-center justify-center shrink-0'>
              <span className='text-sm font-semibold text-muted-foreground'>
                {customer ? getInitials(`${customer.first_name} ${customer.last_name}`) : '??'}
              </span>
            </div>
            <SheetTitle className='text-base font-semibold'>
              {customer ? `${customer.first_name} ${customer.last_name}` : ''}
            </SheetTitle>
          </div>
          <button
            aria-label={t('common.close')}
            className='size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors hover:cursor-pointer'
            type='button'
            onClick={() => onOpenChange(false)}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className='flex-1 overflow-y-auto flex flex-col gap-4 py-4'>
          {loadingData ? (
            <ModalSkeleton />
          ) : (
            <>
              <MembershipSection isActive={membershipIsActive} label={membershipLabel} t={t} />
              <AttendanceSection newAssistanceDate={confirmedAt} slots={weekSlots} t={t} />
              <NoticeArea
                membershipIsExpired={membershipIsExpired}
                registeredEarlierToday={registeredEarlierToday}
                t={t}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className='border-t flex gap-3 pt-4'>
          <Link
            className='flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm border rounded-xl hover:bg-muted transition-colors text-center'
            href={`${CUSTOMER}/${customer?.id}`}
            onClick={() => onOpenChange(false)}
          >
            {t('v2.home.attendanceModal.viewProfile')}
          </Link>
          <button
            className='flex-1 px-4 py-2.5 text-sm font-medium text-white bg-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:cursor-pointer'
            disabled={hasAssistanceToday || submitting || loadingData}
            type='button'
            onClick={handleConfirm}
          >
            {submitting ? t('assistance.waitMoment') : t('v2.home.attendanceModal.confirmCta')}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Sub-componentes

type Translator = ReturnType<typeof useTranslations>['t']

function MembershipSection({
  label,
  isActive,
  t,
}: {
  label: string | null
  isActive: boolean
  t: Translator
}) {
  const badgeText = label
    ? isActive
      ? t('v2.home.attendanceModal.badge.active')
      : t('v2.home.attendanceModal.badge.expired')
    : t('v2.home.attendanceModal.badge.none')

  const badgeTone = label ? (isActive ? 'active' : 'expired') : 'none'

  return (
    <div className='rounded-xl border p-4 flex flex-col gap-2 bg-sidebar-accent-foreground'>
      <div className='flex items-center justify-between'>
        <span className='text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
          {t('v2.home.attendanceModal.membershipSection')}
        </span>
        <span
          className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-full',
            badgeTone === 'active' && 'bg-[#218358] text-white',
            badgeTone === 'expired' && 'bg-destructive/10 text-destructive',
            badgeTone === 'none' && 'bg-muted text-muted-foreground'
          )}
        >
          {badgeText}
        </span>
      </div>
      {label && <span className='text-lg font-semibold'>{label}</span>}
    </div>
  )
}

function AttendanceSection({
  slots,
  newAssistanceDate,
  t,
}: {
  slots: WeekSlot[]
  newAssistanceDate: string | null
  t: Translator
}) {
  const now = new Date()
  const monthLabel = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    timeZone: APP_TIMEZONE,
  }).format(now)
  const monthCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  return (
    <div className='rounded-xl border p-4 flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-muted-foreground'>
          {t('v2.home.attendanceModal.attendanceSection')}
        </span>
        <span className='text-sm text-muted-foreground'>{monthCapitalized}</span>
      </div>

      <ul className='flex flex-col divide-y divide-border border rounded-xl'>
        {slots.map((slot, i) => {
          const attended = slot.assistance
          // true solo para el slot recién confirmado en esta sesión
          const isNew =
            attended != null &&
            newAssistanceDate != null &&
            attended.assistance_date === newAssistanceDate

          return (
            <li key={i} className='flex items-center gap-3 py-2.5 px-4'>
              <span
                className={cn(
                  'text-xs w-10 shrink-0',
                  slot.overQuota ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {t('v2.home.attendanceModal.dayLabel', { n: i + 1 })}
              </span>

              <SlotIcon attended={attended != null} isNew={isNew} />

              <span
                className={cn(
                  'flex-1 text-sm',
                  attended ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  isNew && 'animate-in fade-in-0 slide-in-from-bottom-1 duration-300'
                )}
              >
                {attended ? formatDayLabelInAppTz(new Date(attended.assistance_date)) : '—'}
              </span>

              <span
                className={cn(
                  'text-sm tabular-nums text-muted-foreground shrink-0',
                  isNew && 'animate-in fade-in-0 duration-500'
                )}
              >
                {attended ? formatTimeInAppTz(attended.assistance_date) : '—'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Ocupa el espacio libre entre la lista de días y el CTA, que de otro modo queda
// vacío. Puede mostrar más de un aviso a la vez: vencida y ya-registrado son
// hechos independientes y ninguno reemplaza al otro. La membresía vencida va
// primero porque es la única que pide una acción del staff.
function NoticeArea({
  membershipIsExpired,
  registeredEarlierToday,
  t,
}: {
  membershipIsExpired: boolean
  registeredEarlierToday: WeekAssistance | null
  t: Translator
}) {
  if (!membershipIsExpired && !registeredEarlierToday) return null

  return (
    <div className='flex-1 shrink-0 flex flex-col items-center justify-center gap-6 px-6 py-4'>
      {membershipIsExpired && (
        <ModalNotice
          description={t('v2.home.attendanceModal.expiredNotice.description')}
          icon={<AlertContainedIcon className='size-10 text-[var(--color-feedback-warning)]' />}
          title={t('v2.home.attendanceModal.expiredNotice.title')}
        />
      )}
      {registeredEarlierToday && (
        <ModalNotice
          description={t('v2.home.attendanceModal.registeredAtTime', {
            time: formatTimeInAppTz(registeredEarlierToday.assistance_date),
          })}
          icon={
            <SuccessTick
              className='text-muted-foreground/50'
              color='currentColor'
              exit={false}
              playing={false}
              size={NOTICE_ICON_SIZE}
            />
          }
          title={t('assistance.alreadyRegisteredToday')}
        />
      )}
    </div>
  )
}

function ModalNotice({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className='flex flex-col items-center gap-3 text-center'>
      {icon}
      <div className='flex flex-col gap-1'>
        <p className='text-sm font-medium text-foreground'>{title}</p>
        <p className='text-xs text-muted-foreground text-balance'>{description}</p>
      </div>
    </div>
  )
}

// Los tres estados del slot salen de la misma geometría (SuccessTick): mezclarlos
// con íconos de lucide se nota, porque acá el anillo es más fino y el tilde no se
// sale del círculo.
function SlotIcon({ attended, isNew }: { attended: boolean; isNew: boolean }) {
  return (
    <span
      className={cn(
        'size-5 shrink-0 relative',
        attended ? 'text-foreground' : 'text-muted-foreground/40'
      )}
    >
      {attended ? (
        <SuccessTick
          className={SLOT_ICON_POSITION}
          color='currentColor'
          exit={false}
          playing={isNew}
          size={SLOT_ICON_SIZE}
        />
      ) : (
        <SuccessTickRing className={SLOT_ICON_POSITION} size={SLOT_ICON_SIZE} />
      )}
    </span>
  )
}

function ModalSkeleton() {
  return (
    <div className='flex flex-col gap-4 animate-pulse'>
      <div className='rounded-xl border p-4 h-20 bg-muted/40' />
      <div className='rounded-xl border p-4 h-40 bg-muted/40' />
    </div>
  )
}
