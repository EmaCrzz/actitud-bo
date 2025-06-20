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


export async function updateCustomer({ customerId, formData }: {
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
  console.log({
    firstName,
    lastName,
    personId,
    phone,
    email,
    membershipType
  });

  try {
    // Verificar que el customer existe
    // const { data: existingCustomer, error: fetchError } = await supabase
    //   .from("customers")
    //   .select("id")
    //   .eq("id", customerId)
    //   .single()

    // if (fetchError || !existingCustomer) {
    //   return {
    //     success: false,
    //     message: "Cliente no encontrado",
    //   }
    // }

    // // Verificar si ya existe otro cliente con el mismo person_id
    // const { data: duplicateCheck } = await supabase
    //   .from("customers")
    //   .select("id")
    //   .eq("person_id", personId)
    //   .neq("id", customerId)
    //   .single()

    // if (duplicateCheck) {
    //   return {
    //     success: false,
    //     message: "Ya existe un cliente con ese número de identificación",
    //     errors: {
    //       person_id: ["Este número de identificación ya está registrado"],
    //     },
    //   }
    // }

    // Actualizar el customer
    // const { error: updateError } = await supabase
    //   .from("customers")
    //   .update({
    //     first_name: firstName.trim(),
    //     last_name: lastName.trim(),
    //     person_id: personId.trim(),
    //     phone: phone?.trim() || null,
    //     email: email?.trim() || null,
    //   })
    //   .eq("id", customerId)

    // if (updateError) {
    //   console.error("Error updating customer:", updateError)
    //   return {
    //     success: false,
    //     message: "Error al actualizar el cliente",
    //   }
    // }

    // return {
    //   success: true,
    //   message: "Cliente actualizado exitosamente",
    // }

    // Actualizar cliente y membresía usando RPC

    const { data: result, error } = await supabase.rpc("update_customer_and_membership", {
      p_customer_id: customerId,
      p_first_name: firstName || null,
      p_last_name: lastName || null,
      p_person_id: personId || null,
      p_phone: phone || null,
      p_email: email || null,
      p_membership_type: membershipType || null,
      p_membership_enable: true,
      // p_membership_enable: membershipEnable ?? true,
    })

    if (error) {
      throw new Error(error.message)
    }

    return result
  } catch (error) {
    console.error("Error in updateCustomer:", error)
    return {
      success: false,
      message: "Error interno del servidor",
    }
  }
}
