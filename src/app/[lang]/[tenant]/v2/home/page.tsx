import { getCurrentUser } from '@/auth/api/server'

export default async function V2HomePage() {
  const user = await getCurrentUser()

  return (
    <main className='mx-auto max-w-3xl w-full p-8 space-y-4'>
      <h1 className='text-2xl font-semibold'>V2 Home — placeholder</h1>
      <p className='text-sm text-muted-foreground'>
        Estás autenticado como <span className='font-mono'>{user.email}</span> y tenés el flag{' '}
        <code>v2_access</code> habilitado.
      </p>
      <p className='text-sm text-muted-foreground'>
        Esta pantalla es un placeholder para verificar el gate de la Fase 0. La UI real se
        implementa en fases siguientes del plan.
      </p>
    </main>
  )
}
