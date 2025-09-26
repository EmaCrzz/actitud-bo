import { MedalOne, MedalFive, MedalFour, MedalThree, MedalTwo } from '@/components/icons/medal'
import Cup from '@/components/icons/cup'
import Instagram from '@/components/icons/instagram'
import { cn } from '@/lib/utils'
import { type Language } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'
import api from '@/lib/i18n/api'
import LogoBlanco from '@/assets/logos/blanco/logo'

const Icons = [
  <MedalOne key='MedalOne' className='size-12 text-yellow-400' />,
  <MedalTwo key='MedalTwo' className='size-10 text-gray-300' />,
  <MedalThree key='MedalThree' className='size-10 text-orange-400' />,
  <MedalFour key='MedalFour' className='size-10 text-gray-400' />,
  <MedalFive key='MedalFive' className='size-10 text-gray-400' />,
]

interface TopCustomer {
  id: string
  first_name: string
  last_name: string
  monthly_assistance_count: number
}

interface ShareableTopImageProps {
  data: TopCustomer[]
  lang: Language
  tenant: TenantsType
  className?: string
}

export default async function ShareableTopImage({
  data,
  lang,
  tenant,
  className = ''
}: ShareableTopImageProps) {
  const { t } = await api.fetch(lang, tenant)
  const currentMonth = new Date().toLocaleDateString(lang, { month: 'long', year: 'numeric' })

  return (
    <div
      className={cn(
        'w-[400px] h-[600px] bg-gradient-to-br from-primary to-primary200 p-6 flex flex-col',
        className
      )}
      id="shareable-top-image"
    >
      {/* Header */}
      <div className='text-center mb-6'>
        <div className='flex justify-center mb-3'>
          <LogoBlanco className='h-8 w-auto' />
        </div>
        <p className='text-white/80 text-sm capitalize'>{t('assistance.topOfTheMonth')} {currentMonth}</p>
      </div>

      {/* Title */}
      <div className='flex gap-3 items-center justify-center text-white font-bold text-lg mb-6'>
        <Cup className='size-8 text-yellow-400' />
        <span>{t('assistance.topMonthlyAssistants')}</span>
      </div>

      {/* Ranking */}
      <div className='space-y-2.5'>
        {data?.slice(0, 5).map((assistant, index) => (
          <div
            key={assistant.id}
            className='flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-2.5'
          >
            {Icons[index] || (
              <div className='flex items-center justify-center size-12 bg-white/20 rounded-full'>
                <span className='text-sm font-bold text-white'>#{index + 1}</span>
              </div>
            )}

            <div className='flex items-center justify-between flex-1'>
              <p className='text-white font-medium text-base'>
                {`${assistant.first_name} ${assistant.last_name}`}
              </p>
              <span className='text-white font-bold text-xl bg-white/20 rounded-full px-3 py-1'>
                {assistant.monthly_assistance_count}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className='text-center mt-6'>
        <p className='text-white/80 text-sm mb-1'>{t('assistance.joinUs')}</p>
        <div className='flex items-center justify-center gap-1'>
          <Instagram className='w-[14px] h-[14px] text-white' />
          <p className='text-white text-xs'>@actitud.tabossi</p>
        </div>
      </div>
    </div>
  )
}