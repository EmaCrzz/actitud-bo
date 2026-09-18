import { getEndOfMonthIsoDateInAppTz, getTodayIsoDateInAppTz } from '@/lib/timezone'
import type { ChargeMode } from '@/membership/charge-mode'
import { MEMBERSHIP_TYPE_DAILY, type MembershipTypes } from '@/membership/consts'

export interface CustomerFormPersonalValues {
  first_name: string
  last_name: string
  person_id: string
  /** "YYYY-MM-DD" o "". Día calendario: no se convierte a instante. */
  birth_date: string
  phone: string
}

export interface CustomerFormMembershipValues {
  membership_type: MembershipTypes | ''
  charge_mode: ChargeMode
  /** "YYYY-MM-DD". Canonicalizadas a instante AR recién al salir hacia el RPC. */
  start_date: string
  end_date: string
  payment_type: string
  notes: string
}

export const EMPTY_PERSONAL_VALUES: CustomerFormPersonalValues = {
  first_name: '',
  last_name: '',
  person_id: '',
  birth_date: '',
  phone: '',
}

/**
 * Valores iniciales del paso 2, con las fechas prellenadas.
 *
 * **Inicio = hoy, vencimiento = fin del mes en curso.** La captura del diseño
 * muestra 01/08 → 31/08 con "hoy" = 01/08, que no alcanza para distinguir entre
 * "fin de mes" y "+30 días" — ese día dan lo mismo. La regla la definió Ema: es
 * fin de mes, y encaja con el ciclo de cobro día-de-mes fijo de Actitud
 * (ACTITUD_BILLING_POLICY). Si cada cliente venciera 30 días después de su alta,
 * los vencimientos se desparramarían por el calendario y el recargo por mora —
 * que se calcula contra el día del mes — dejaría de tener sentido.
 *
 * Es un prefill, no una imposición: los dos datepickers quedan editables.
 *
 * Se calcula en cada apertura del panel y no como constante de módulo: un
 * módulo evaluado el 31 a las 23:59 dejaría el prefill un día atrasado para
 * toda la sesión.
 */
export function buildInitialMembershipValues(): CustomerFormMembershipValues {
  return {
    membership_type: '',
    charge_mode: 'full',
    start_date: getTodayIsoDateInAppTz(),
    end_date: getEndOfMonthIsoDateInAppTz(),
    payment_type: '',
    notes: '',
  }
}

/**
 * Período efectivo que se manda a la DB.
 *
 * **El pase diario no tiene fechas que elegir: empieza y vence hoy.** Es su
 * definición — el cliente entra y paga el mismo día — así que pedírselas al
 * operador no es flexibilidad, es una manera de equivocarse: con el prefill de
 * fin de mes, un pase diario de $7.000 quedaba habilitado todo el mes. El
 * validador tampoco lo habría frenado, porque `basicMembershipValidation` saltea
 * los chequeos de rango justamente cuando el tipo es diario.
 *
 * La regla se resuelve acá y no mutando el estado al elegir el tipo: derivarla
 * en el momento de usarla hace imposible que quede desincronizada si el operador
 * cambia de tipo y vuelve. La misma función alimenta lo que se muestra en
 * pantalla y lo que se envía, así que no pueden divergir.
 *
 * Es la misma regla que v1 ya aplicaba, ahí con dos `<input type='hidden'>`
 * ([membership-form.tsx](../../membership-form.tsx)).
 */
export function resolveMembershipPeriod(values: CustomerFormMembershipValues): {
  start_date: string
  end_date: string
} {
  if (values.membership_type === MEMBERSHIP_TYPE_DAILY) {
    const today = getTodayIsoDateInAppTz()

    return { start_date: today, end_date: today }
  }

  return { start_date: values.start_date, end_date: values.end_date }
}
