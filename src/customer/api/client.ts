import { createClient } from "@/lib/supabase/client";
import { Customer } from "@/customer/types";
import { SEARCH_CUSTOMER } from "@/customer/consts";
import { createAssistance } from "@/assistance/api/client";
import { toast } from "sonner";
import { removeFormatPersonId } from "@/lib/format-person-id";
import { DatabaseResult } from "@/types/database-errors";

export const searchCustomer = async (query?: string) => {
  if (!query) return []
  const supabase = createClient();
  const { data } = await supabase
    .from('customers')
    .select(SEARCH_CUSTOMER)
    .ilike('first_name', `%${query}%`)
    .order('first_name', {
      ascending: true
    })

  const customers: Customer[] = data?.map((customer) => {
    const membership_type = customer.customer_membership?.[0]?.membership_type || null;

    return ({
      ...customer,
      membership_type,
    })
  }) || [];

  return customers;
}

export async function upsertCustomer({ customerId, formData }: {
  customerId: string,
  formData: FormData
}): Promise<DatabaseResult & { customer?: Customer }> {
  const supabase = createClient()

  // Extraer datos del formulario
  const firstName = formData.get("first_name") as string
  const lastName = formData.get("last_name") as string
  const personId = formData.get("person_id") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const membershipType = formData.get("membership_type") as string
  const firstAssistance = formData.get("first-assistance") as 'on' | null

  // Validaciones básicas
  const errors: DatabaseResult["data"] = {}

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

  if (!membershipType) {
    errors.membership_type = "El tipo de membresía es requerido"
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Por favor corrige los errores en el formulario",
      error_code: "MISSING_REQUIRED_FIELDS",
      operation: customerId ? "update" : "create",
      data: errors,
    }
  }

  // try {
  const { data, error } = await supabase.rpc("upsert_customer_with_membership", {
    p_customer_id: customerId || null,
    p_first_name: firstName || null,
    p_last_name: lastName || null,
    p_person_id: removeFormatPersonId(personId) || null,
    p_phone: phone || null,
    p_email: email || null,
    p_membership_type: membershipType
    // p_last_payment_date 
    // p_expiration_date
  })

  if (error) {
    return {
      success: false,
      message: "Ocurrió un error al procesar la solicitud",
      error_code: 'UNEXPECTED_ERROR',
      operation: customerId ? "update" : "create",
    }
  }

  const result = data as DatabaseResult

  if (!result.success) {
    return result
  }


  if (firstAssistance === 'on' && data?.customer?.id) {
    const { error } = await createAssistance({ customer_id: data.customer.id });

    if (error?.code) {
      toast.error("Error al registrar asistencia", {
        description: error.message,
      });
    }
  }

  return result
}

export async function updateCustomerMembership({ customerId, formData }: {
  customerId: string,
  formData: FormData
}): Promise<DatabaseResult> {
  const supabase = createClient()
  const startDate = formData.get("start_date") as string
  const endDate = formData.get("end_date") as string
  const membershipType = formData.get("membership_type") as string
  const payment = formData.get("payment") as 'on' | null
  const isPaid = payment === 'on' ? true : false
  const { data: updatedMembership, error: updateError } = await supabase
    .from("customer_membership")
    .update({
      membership_type: membershipType,
      last_payment_date: isPaid ? startDate : null,
      expiration_date: isPaid ? endDate : null
    })
    .eq("customer_id", customerId)
    .select()
    .single()

  if (updateError) {
    return {
      success: false,
      error_code: "UPDATE_MEMBERSHIP_ERROR",
      message: "Error al actualizar la membresía: " + updateError.message,
      operation: "update"
    }
  }
  
  return {
    success: true,
    operation: "updated",
    message: "Membresía actualizada correctamente",
    data: updatedMembership
  }

}
