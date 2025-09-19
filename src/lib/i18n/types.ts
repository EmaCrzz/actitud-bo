export const LANGUAGES = {
  ES: 'es',
  EN: 'en'
} as const

export type Language = (typeof LANGUAGES)[keyof typeof LANGUAGES]

// Utility types for generating dot notation paths from nested objects
type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${"" extends P ? "" : "."}${P}`
    : never
  : never;

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

type Paths<T, D extends number = 10> = [D] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? `${K}` | Join<K, Paths<T[K], Prev[D]>>
        : never;
    }[keyof T]
  : "";

// Import the type of the Spanish dictionary to infer the structure
type TranslationDictionary = typeof import("./dictionaries/es.json");

// Generate the typed keys based on the actual structure  
export type TranslationKey = Paths<TranslationDictionary>;

export type TranslationParams = Record<string, string | number>;