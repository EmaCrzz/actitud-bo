import { createClient } from "@/lib/supabase/client";
import { Customer } from "@/customer/types";
import { SEARCH_CUSTOMER } from "@/customer/consts";

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

export interface CustomerFormResponse {
  success?: boolean
  message?: string
  errors?: {
    first_name?: string[]
    last_name?: string[]
    person_id?: string[]
    phone?: string[]
    email?: string[]
  }
}


export async function upsertCustomer({ customerId, formData }: {
  customerId: string,
  formData: FormData
}): Promise<CustomerFormResponse> {
  const supabase = createClient()

  // Extraer datos del formulario
  const firstName = formData.get("first_name") as string
  const lastName = formData.get("last_name") as string
  const personId = formData.get("person_id") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string
  const membershipType = formData.get("membership_type") as string

  // Validaciones básicas
  const errors: CustomerFormResponse["errors"] = {}

  if (!firstName?.trim()) {
    errors.first_name = ["El nombre es requerido"]
  }

  if (!lastName?.trim()) {
    errors.last_name = ["El apellido es requerido"]
  }

  if (!personId?.trim()) {
    errors.person_id = ["El número de identificación es requerido"]
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ["El formato del email no es válido"]
  }

  if (phone && !/^\+?[\d\s\-$$$$]+$/.test(phone)) {
    errors.phone = ["El formato del teléfono no es válido"]
  }

  // Si hay errores, retornarlos
  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Por favor corrige los errores en el formulario",
      errors,
    }
  }
  
  try {
    const { data, error } = await supabase.rpc("upsert_customer_with_membership", {
      p_customer_id: customerId || null,
      p_first_name: firstName || null,
      p_last_name: lastName || null,
      p_person_id: personId || null,
      p_phone: phone || null,
      p_email: email || null,
      p_membership_type: membershipType || null,
      // p_last_payment_date 
      // p_expiration_date
    })

    if (error) {
      console.error("Error al insertar o actualizar el cliente:", error)
      return {
        success: false,
        message: error.message || "Error al procesar la solicitud",
      }
    }

    return data
  } catch (error) {
    console.error("Error in updateCustomer:", error)
    return {
      success: false,
      message: "Error interno del servidor",
    }
  }
}
