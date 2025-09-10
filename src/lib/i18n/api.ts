import type { Language, TranslationKey, TranslationParams } from "./types"
import { TENANT } from "../envs"

const api = {
  async fetch(lang: Language) {
    try {
      // Load base dictionary
      const baseDictionary = await import(`./dictionaries/${lang}.json`).then(
        (module) => module.default,
      );

      // Try to load tenant-specific overrides
      let tenantOverrides = {}
      try {
        tenantOverrides = await import(`./dictionaries/tenant/${TENANT}.json`).then(
          (module) => module.default,
        );
      } catch (error) {
        // Tenant overrides are optional, continue without them
        console.warn(`No tenant overrides found for ${TENANT}, using base translations only`)
      }

      // Deep merge base dictionary with tenant overrides
      const mergedDictionary = deepMerge(baseDictionary, tenantOverrides)

      return {
        dictionary: mergedDictionary,
        t: createTranslator(mergedDictionary),
      };
    } catch (error) {
      console.error("Failed to fetch dictionary:", error);
      throw new Error("Failed to fetch dictionary");
    }
  },
};

// Deep merge utility to combine base and tenant translations
function deepMerge(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
  const result = { ...base }
  
  for (const key in override) {
    if (override[key] !== null && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(result[key] || {}, override[key])
    } else {
      result[key] = override[key]
    }
  }
  
  return result
}

function createTranslator(dictionary: Record<string, any>) {
  return function t(key: TranslationKey, params?: TranslationParams): string {
    // Navigate through nested object using dot notation
    const keys = key.split('.')
    let translation: any = dictionary
    
    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k]
      } else {
        // Fallback to the key if translation not found
        console.warn(`Translation not found for key: ${key}`)
        return key
      }
    }
    
    // If final value is not a string, return the key
    if (typeof translation !== 'string') {
      console.warn(`Translation for key "${key}" is not a string`)
      return key
    }
    
    // If no params, return translation as is
    if (!params) return translation;

    // Replace parameters in the format {param}
    return translation.replace(/\{(\w+)\}/g, (_: string, param: string) => {
      return String(params[param] ?? `{${param}}`);
    });
  };
}

export default api;