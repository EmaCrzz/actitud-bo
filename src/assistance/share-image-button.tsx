'use client'

import { Button } from '@/components/ui/button'
import Instagram from '@/components/icons/instagram'
import { useShareImage } from '@/lib/hooks/use-share-image'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShareImageButtonProps {
  shareText: string
}

export default function ShareImageButton({ shareText }: ShareImageButtonProps) {
  const { generateAndShareImage, isGenerating, error } = useShareImage()

  const handleShare = async () => {
    await generateAndShareImage('shareable-top-image', 'top-asistencias.png')
  }

  return (
    <>
      <Button
        className={cn('w-full mt-2 items-center font-sans !text-primary200 !bg-transparent')}
        disabled={isGenerating}
        variant={'ghost'}
        onClick={handleShare}
      >
        {isGenerating ? (
          <Loader2 className='size-6 animate-spin' />
        ) : (
          <Instagram className='size-6 text-primary200' />
        )}
        {isGenerating ? 'Generando...' : shareText}
      </Button>
      {error && <p className='text-red-500 text-sm mt-2 text-center'>{error}</p>}
    </>
  )
}
