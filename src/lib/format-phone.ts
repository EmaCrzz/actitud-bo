// Función para formatear teléfonos argentinos
export function formatPhone(phone: string | number): string {
  const cleanPhone = phone.toString().replace(/\D/g, '')
  let phoneNumber = cleanPhone
  
  // Remover código de país (54) si está presente
  if (phoneNumber.startsWith('54') && phoneNumber.length > 10) {
    phoneNumber = phoneNumber.substring(2)
  }
  
  // Formatear según longitud y tipo
  if (phoneNumber.length === 10) {
    if (phoneNumber.startsWith('11')) {
      // Buenos Aires móvil: (011) 15-xxxx-xxxx
      return phoneNumber.replace(/(\d{2})(\d{2})(\d{4})(\d{4})/, '($1) $2-$3-$4')
    } else {
      // Interior móvil: (0xxx) 15-xxx-xxxx
      return phoneNumber.replace(/(\d{3})(\d{2})(\d{3})(\d{4})/, '($1) $2-$3-$4')
    }
  } else if (phoneNumber.length === 8) {
    // Fijo Buenos Aires: (011) xxxx-xxxx
    return phoneNumber.replace(/(\d{4})(\d{4})/, '(011) $1-$2')
  }
  
  return cleanPhone
}

// Función para validar teléfonos
export function isValidPhone(phone: string | number): boolean {
  const cleanPhone = phone.toString().replace(/\D/g, '')
  return cleanPhone.length >= 8 && cleanPhone.length <= 10
}