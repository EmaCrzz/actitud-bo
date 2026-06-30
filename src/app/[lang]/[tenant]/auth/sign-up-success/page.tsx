import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/i18n/api'
import type { Language } from '@/lib/i18n/types'
import type { TenantsType } from '@/lib/tenants'

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string; tenant: string }>
}) {
  const { lang, tenant } = await params
  const { t } = await api.fetch(lang as Language, tenant as TenantsType)

  return (
    <div className='flex min-h-svh w-full items-center justify-center p-6 md:p-10 pt-4'>
      <div className='w-full max-w-sm'>
        <div className='flex flex-col gap-6'>
          <Card>
            <CardHeader>
              <CardTitle className='text-2xl'>{t('auth.signUpSuccess.title')}</CardTitle>
              <CardDescription>{t('auth.signUpSuccess.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground'>{t('auth.signUpSuccess.message')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
