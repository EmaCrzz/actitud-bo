import { I18nClientProvider } from './context'
import { getServerT } from './server'

// Puente server → client del diccionario. Ya no recibe lang/tenant por props:
// los resuelve getServerT desde env, igual que el resto de los consumers server.
export async function I18nServerProvider({ children }: { children: React.ReactNode }) {
  const { dictionary } = await getServerT()

  return <I18nClientProvider dictionary={dictionary}>{children}</I18nClientProvider>
}
