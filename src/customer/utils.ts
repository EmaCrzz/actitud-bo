export function basicCustomerValidation(formData: FormData) {
  // Extraer datos del formulario
  const firstName = formData.get("first_name") as string
  const lastName = formData.get("last_name") as string
  const personId = formData.get("person_id") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string

  // Validaciones básicas
  const errors: Record<string, string> = {}

  if (!firstName?.trim()) {
    errors.first_name = "El nombre es requerido"
  }

  if (!lastName?.trim()) {
    errors.last_name = "El apellido es requerido"
  }

  if (!personId?.trim()) {
    errors.person_id = "El número de identificación es requerido"
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "El formato del email no es válido"
  }

  if (phone && !/^\+?[\d\s\-$$$$]+$/.test(phone)) {
    errors.phone = "El formato del teléfono no es válido"
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

export function basicMembershipValidation(formData: FormData) {
  const membershipType = formData.get("membership_type") as string
  const startDate = formData.get("start_date") as string
  const endDate = formData.get("end_date") as string
  const payment = formData.get("payment") as 'on' | null
  const isPaid = payment === 'on' ? true : false
  const firstAssistance = formData.get("first_assistance") as 'on' | null
  const isFirstAssistance = firstAssistance === 'on' ? true : false
  const errors: Record<string, string> = {}

  if (!membershipType?.trim()) {
    errors.membership_type = "El tipo de membresía es requerido"
  }
  if (!isPaid) {
    return {
      valid: Object.keys(errors).length === 0,
      errors
    }
  }
  if (!startDate?.trim()) {
    errors.start_date = "La fecha de inicio es requerida"
  }
  if (!endDate?.trim()) {
    errors.end_date = "La fecha de finalización es requerida"
  }
  if (new Date(startDate) >= new Date(endDate)) {
    errors.end_date = "La fecha de finalización debe ser posterior a la fecha de inicio"
  }
  // verificar que la la diferencia entre la fecha de inicio y la fecha de finalización sea menor 1 mes

  const startDateObj = new Date(startDate)
  const endDateObj = new Date(endDate)
  const oneMonthLater = new Date(startDateObj)

  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)

  if (endDateObj > oneMonthLater) {
    errors.end_date = "La fecha de finalización no puede ser mayor a un mes después de la fecha de inicio"
  }

  if (isFirstAssistance) {
    const today = new Date()

    // check if the end date is before today
    if (endDateObj < today) {
      errors.first_assistance = "No se puede registrar una asistencia si la membresía no está pagada o está vencida"
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}