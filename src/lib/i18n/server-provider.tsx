import api from './api'
import { Language } from './types'
import { I18nClientProvider } from './context'
import { TenantsType } from '../tenants'

export async function I18nServerProvider({
  children,
  lang,
  tenant,
}: {
  children: React.ReactNode
  lang: Language
  tenant: TenantsType
}) {
  const { dictionary } = await api.fetch(lang, tenant)

  return <I18nClientProvider dictionary={dictionary}>{children}</I18nClientProvider>
}
