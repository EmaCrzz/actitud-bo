// Función principal para formatear DNI
export function formatPersonId(dni: string | number): string {
  const cleanDNI = dni.toString().replace(/\D/g, '')
  
  if (cleanDNI.length < 7 || cleanDNI.length > 8) {
    return cleanDNI
  }
  
  if (cleanDNI.length === 7) {
    return cleanDNI.replace(/(\d{1})(\d{3})(\d{3})/, '$1.$2.$3')
  } else {
    return cleanDNI.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3')
  }
}
// Función limpiar formato de DNI
export function removeFormatPersonId(dni: string): string {
  return dni.replaceAll('.', '').replaceAll('-', '').replaceAll(' ', '')
}

// Función para validar DNI
export function isValidDNI(dni: string | number): boolean {
  const cleanDNI = dni.toString().replace(/\D/g, '')

  return cleanDNI.length >= 7 && cleanDNI.length <= 8
}