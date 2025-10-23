// /* eslint-disable no-console */
// import { getTranslations, LANGUAGES, type Language } from './index'
// import type { TranslationKey } from './types'

// // Server-side function to get translations
// // Use this in Server Components, API routes, and server actions
// export async function getServerTranslations(lang: Language = LANGUAGES.ES) {
//   try {
//     return await getTranslations(lang)
//   } catch (error) {
//     console.error('Error loading server translations:', error)

//     // Return fallback translator that returns the key
//     return {
//       dictionary: {},
//       t: (key: TranslationKey) => key
//     }
//   }
// }

// // Helper to get only the t function for server components
// export async function getServerT(lang: Language = LANGUAGES.ES) {
//   const { t } = await getServerTranslations(lang)

//   return t
// }
