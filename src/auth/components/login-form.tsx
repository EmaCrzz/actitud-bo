'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import LogoBlanco from '@/assets/logos/blanco/logo'
import { signUp } from '@/auth/api/client'
import { HOME } from '@/consts/routes'
import { useRateLimitHandler } from '@/components/rate-limit-handler'
import { useTranslations } from '@/lib/i18n/context'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { executeWithRateLimit } = useRateLimitHandler()
  const { t } = useTranslations()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    await executeWithRateLimit(() => signUp({ email, password }), {
      onSuccess: () => {
        router.push(HOME)
      },
      onError: (error) => {
        setError(error instanceof Error ? error.message : t('forms.errors.loginError'))
      },
      fallbackErrorMessage: t('forms.errors.loginFallback'),
    })

    setIsLoading(false)
  }

  return (
    <>
      <header className='max-w-2xl mx-auto w-full py-11 flex justify-center items-center pt-8'>
        <LogoBlanco />
      </header>
      <section className='max-w-2xl mx-auto w-full px-4 pt-11'>
        <form onSubmit={handleLogin}>
          <div className='flex flex-col gap-12'>
            <div className='grid gap-2'>
              <Label htmlFor='email'>{t('forms.labels.email')}</Label>
              <Input
                required
                autoComplete={'off'}
                id='email'
                placeholder={t('forms.placeholders.email')}
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className='grid gap-2'>
              <div className='flex items-center'>
                <Label htmlFor='password'>{t('forms.labels.password')}</Label>
              </div>
              <Input
                required
                className='p-0 m-0'
                componentRight={
                  <Button
                    aria-label={
                      showPassword
                        ? t('forms.actions.hidePassword')
                        : t('forms.actions.showPassword')
                    }
                    className='h-4 w-4'
                    size='icon'
                    type='button'
                    variant='ghost'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                  </Button>
                }
                id='password'
                placeholder={t('forms.placeholders.password')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className='text-sm text-red-500'>{error}</p>}
            <Button
              className='w-full h-14'
              disabled={isLoading}
              loading={isLoading}
              loadingText={t('forms.actions.waitMoment')}
              type='submit'
            >
              {t('buttons.login')}
            </Button>
          </div>
        </form>
      </section>
    </>
  )
}
