import { Card, CardContent } from '@/components/ui/card'
import { getTopCustomersThisMonthRPC } from '@/assistance/api/server'
import api from '@/lib/i18n/api'
import { type Language } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'
import { MedalOne, MedalFive, MedalFour, MedalThree, MedalTwo } from '@/components/icons/medal'
import Cup from '@/components/icons/cup'
import { cn } from '@/lib/utils'
import ShareableTopImage from './shareable-top-image'
import ShareImageButton from './share-image-button'
import { Skeleton } from '@/components/ui/skeleton'

const Icons = [
  <MedalOne key='MedalOne' className='size-10 text-yellow-400' />,
  <MedalTwo key='MedalTwo' className='size-10 text-yellow-400' />,
  <MedalThree key='MedalThree' className='size-10 text-yellow-400' />,
  <MedalFour key='MedalFour' className='size-10 text-yellow-400' />,
  <MedalFive key='MedalFive' className='size-10 text-yellow-400' />,
]

export default async function TopMonthlyAssintant({
  lang,
  tenant,
}: {
  lang: Language
  tenant: TenantsType
}) {
  const { data } = await getTopCustomersThisMonthRPC()
  const { t } = await api.fetch(lang, tenant)

  const hasData = data && data.length > 0

  return (
    <Card className='p-4 gap-y-6'>
      <div className='flex gap-2 items-center text-primary200 font-semibold text-xl border-b border-primary pb-1'>
        <Cup className='size-8 text-yellow-400' />
        {t('assistance.topMonthlyAssistants')}
      </div>
      <CardContent className='p-0'>
        {hasData ? (
          <>
            {data.map((assistant, index) => (
              <div
                key={assistant.id}
                className={cn(
                  'flex items-center justify-between gap-3 sm:gap-3 py-3 bg-inputhover border-b',
                  index === 0 && 'pt-0'
                )}
              >
                {Icons[index] || (
                  <div className='flex items-center justify-center size-10 bg-primary200 rounded-full '>
                    <span className='text-sm font-bold text-white/70'>#{index + 1}</span>
                  </div>
                )}

                <div className='flex items-center justify-between grow gap-2'>
                  <p className='text-base'>{`${assistant.first_name} ${assistant.last_name}`}</p>
                  <span className='text-lg'>{assistant.monthly_assistance_count}</span>
                </div>
              </div>
            ))}
            <ShareImageButton shareText={t('buttons.share')} />

            {/* Hidden component for image generation */}
            <div className='fixed -top-[9999px] -left-[9999px] pointer-events-none'>
              <ShareableTopImage data={data} lang={lang} tenant={tenant} />
            </div>
          </>
        ) : (
          <div className='py-8 text-center text-muted-foreground'>
            <p>{t('assistance.noTopAssistants')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const TopMonthlyAssintantSkeleton = async ({
  lang,
  tenant,
}: {
  lang: Language
  tenant: TenantsType
}) => {
  const { t } = await api.fetch(lang, tenant)

  return (
    <Card className='p-4 gap-y-6'>
      <div className='flex gap-2 items-center text-primary200 font-semibold text-xl border-b border-primary pb-1'>
        <Cup className='size-8 text-yellow-400' />
        {t('assistance.topMonthlyAssistants')}
      </div>
      <CardContent className='p-0'>
        {[0, 1, 2, 3, 4]?.map((index) => (
          <div
            key={index}
            className={cn(
              'flex items-center justify-between gap-3 sm:gap-3 py-3 bg-inputhover border-b',
              index === 0 && 'pt-0'
            )}
          >
            {Icons[index] || (
              <div className='flex items-center justify-center size-10 bg-primary200 rounded-full '>
                <span className='text-sm font-bold text-white/70'>#{index + 1}</span>
              </div>
            )}

            <div className='flex items-center justify-between grow gap-2'>
              <Skeleton className='h-5 w-32' />
              <Skeleton className='h-7 w-10' />
            </div>
          </div>
        ))}
        <Skeleton className='h-10 w-full mt-2' />
      </CardContent>
    </Card>
  )
}
