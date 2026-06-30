// import api from "./api"
// import { LANGUAGES, type Language } from "./types"

// // Default language
// const DEFAULT_LANGUAGE: Language = LANGUAGES.ES

// // Get browser language or fallback to default
// export function getBrowserLanguage(): Language {
//   if (typeof window === 'undefined') return DEFAULT_LANGUAGE

//   const browserLang = navigator.language.slice(0, 2)

//   return Object.values(LANGUAGES).includes(browserLang as Language)
//     ? browserLang as Language
//     : DEFAULT_LANGUAGE
// }

// // Get language from URL, localStorage, or browser
// export function getLanguage(): Language {
//   if (typeof window === 'undefined') return DEFAULT_LANGUAGE

//   // Check URL params first
//   const urlParams = new URLSearchParams(window.location.search)
//   const urlLang = urlParams.get('lang')

//   if (urlLang && Object.values(LANGUAGES).includes(urlLang as Language)) {
//     return urlLang as Language
//   }

//   // Check localStorage
//   const savedLang = localStorage.getItem('language')

//   if (savedLang && Object.values(LANGUAGES).includes(savedLang as Language)) {
//     return savedLang as Language
//   }

//   // Fallback to browser language
//   return getBrowserLanguage()
// }

// // Save language preference
// export function setLanguage(lang: Language) {
//   if (typeof window === 'undefined') return
//   localStorage.setItem('language', lang)
// }

// // Main function to get translations for any environment
// export async function getTranslations(lang?: Language) {
//   const language = lang || getLanguage()

//   return await api.fetch(language)
// }

// export { LANGUAGES, type Language }
