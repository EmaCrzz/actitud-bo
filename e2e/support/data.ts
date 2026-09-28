/**
 * Datos efímeros para los specs.
 *
 * Dos reglas, y las dos existen porque la DB de dev es un backup de producción
 * con gente real adentro:
 *
 * 1. Todo registro creado por la suite lleva `E2E_PREFIX` en el nombre. Es lo
 *    que hace posible el cleanup (`npm run test:e2e:clean`) y lo que permite
 *    reconocer de un vistazo un residuo de test en una lista.
 *
 * 2. Los DNI se emiten en el rango 99.xxx.xxx, que no está asignado en
 *    Argentina. Así un cliente de test no puede colisionar con el DNI de una
 *    persona real del backup — que además de ensuciar datos, dispararía el
 *    "ya existe un cliente con ese DNI" y haría fallar el test por la razón
 *    equivocada.
 */
export const E2E_PREFIX = '[E2E]'

/** Rango de DNI no asignado en Argentina, reservado acá para datos de test. */
const TEST_DNI_PREFIX = '99'

export interface TestCustomer {
  firstName: string
  lastName: string
  personId: string
  phone: string
}

/**
 * Cliente único por invocación.
 *
 * `label` sirve para saber qué spec dejó el registro si algo queda colgado
 * después de un fallo a mitad de camino.
 */
export function buildTestCustomer(label: string): TestCustomer {
  const stamp = Date.now().toString().slice(-6)
  const noise = Math.floor(Math.random() * 900 + 100)

  return {
    firstName: `${E2E_PREFIX} ${label}`,
    lastName: `Test ${stamp}`,
    // 8 dígitos: 99 + 6. `formatPersonId` lo muestra como 99.xxx.xxx.
    personId: `${TEST_DNI_PREFIX}${stamp}`,
    phone: `11${noise}0000`,
  }
}

/** Nombre completo tal como lo renderiza la app (first + last). */
export function fullName(customer: TestCustomer): string {
  return `${customer.firstName} ${customer.lastName}`
}
