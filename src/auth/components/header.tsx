import { getProfile } from '@/auth/api/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IsoBlanco from '@/assets/logos/blanco/iso'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import MenuAuth from '@/auth/components/menu'
import { getServerT } from '@/lib/i18n/server'
import { getIntlLocale } from '@/lib/i18n/locale'
import { formatTodayLongInAppTz } from '@/lib/format-date'

export default async function AuthHeader() {
  const supabase = await createClient()
  const { t, lang } = await getServerT()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/auth/login')
  }

  const profile = await getProfile(data.user.id)
  const fullName = profile ? `${profile?.first_name} ${profile?.last_name}` : data.user.email
  const avatarUrl = profile?.picture || null
  const avatarFallback = profile
    ? `${profile?.first_name} ${profile?.last_name}`
    : data.user.email?.charAt(0).toUpperCase()

  // Antes formateaba sin timeZone, así que en Vercel (UTC) mostraba el día
  // siguiente entre las 21:00 y la medianoche AR. Y usaba 'es-ES' en vez de
  // 'es-AR'. formatTodayLongInAppTz resuelve ambas.
  const today = formatTodayLongInAppTz(getIntlLocale(lang))

  return (
    <header className='max-w-3xl mx-auto w-full px-4 flex gap-2 justify-between items-center pt-4'>
      <div className='flex gap-4 items-center'>
        <div className='size-12 sm:size-14 rounded-full bg-primary'>
          <IsoBlanco className='size-12 sm:size-14' />
        </div>
        <div>
          <h3 className='font-medium text-xs sm:text-sm'>
            {t('customer.welcome', { name: fullName || '' })}
          </h3>
          <p className='font-medium text-xs sm:text-sm capitalize'>{today}</p>
        </div>
      </div>
      <div className='relative'>
        <MenuAuth>
          <Avatar className='size-12'>
            {avatarUrl && (
              <AvatarImage alt={data.user.email} className='object-cover' src={avatarUrl} />
            )}
            <AvatarFallback className='font-medium text-xs'>{avatarFallback}</AvatarFallback>
          </Avatar>
        </MenuAuth>

        <div className='absolute left-2 bottom-0 size-2 bg-green-400 rounded-full' />
      </div>
    </header>
  )
}

export const AuthHeaderLoader = () => {
  return (
    <header className='max-w-3xl mx-auto w-full px-4 flex justify-between items-center pt-4'>
      <div className='flex gap-4 items-center'>
        <Skeleton className='size-14 rounded-full' />
        <div>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-3 w-16 mt-1' />
        </div>
      </div>
      <div className='relative'>
        <Skeleton className='h-12 w-12 rounded-full' />
      </div>
    </header>
  )
}
