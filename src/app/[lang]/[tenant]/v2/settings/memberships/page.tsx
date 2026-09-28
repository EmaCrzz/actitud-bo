import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ROUTES_V2 } from '@/consts/routes'
import { getServerT } from '@/lib/i18n/server'
import { getMembershipPlans } from '@/membership/api/server'
import MembershipPlansSection from '@/membership/components/v2/MembershipPlansSection'

/**
 * Configuraciones → Membresías (Fase 10).
 *
 * Es un editor del catálogo de planes, no de las membresías de los clientes.
 * Vive bajo `settings/` y no en el primer nivel porque ahí lo ponen las
 * capturas del 2026-09-28: el sidebar tiene `Configuraciones` desplegado con
 * `Membresías` marcado, y no dibuja un ítem `Membresías` de primer nivel.
 */
export default async function V2SettingsMembershipsPage() {
  const { t, lang } = await getServerT()
  const { data: plans, error } = await getMembershipPlans()

  return (
    <div className='flex min-h-full flex-col rounded-lg border p-2.5 md:h-full lg:p-5'>
      {/* Sólo mobile, igual que Asistencias: en desktop el sidebar está a la
          vista y el header de la app ya ubica al operador. */}
      <div className='mb-4 flex items-center gap-3 md:hidden'>
        <Link
          aria-label={t('common.back')}
          className='flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted'
          href={ROUTES_V2.V2_HOME}
        >
          <ArrowLeft className='size-5' />
        </Link>
        <h1 className='text-base font-semibold'>{t('v2.membership.plans.title')}</h1>
      </div>

      <MembershipPlansSection failed={Boolean(error)} lang={lang} plans={plans} />
    </div>
  )
}
