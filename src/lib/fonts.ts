import localFont from 'next/font/local'

export const unbounded = localFont({
  src: [
    {
      path: '../../public/fonts/unbounded/light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/unbounded/medium.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/unbounded/semiBold.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/unbounded/bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/fonts/unbounded/extraBold.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--font-unbounded',
  display: 'swap',
})

export const poppins = localFont({
  src: [
    {
      path: '../../public/fonts/poppins/light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/poppins/regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/poppins/semiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/poppins/bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-poppins',
  display: 'swap',
})