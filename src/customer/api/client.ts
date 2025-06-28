import { createClient } from "@/lib/supabase/client";
import { Customer } from "@/customer/types";
import { SEARCH_CUSTOMER } from "@/customer/consts";
import { createAssistance } from "@/assistance/api/client";
import { toast } from "sonner";
import { removeFormatPersonId } from "@/lib/format-person-id";
import { DatabaseResult } from "@/types/database-errors";
import { basicCustomerValidation, basicMembershipValidation } from "../utils";

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

export async function checkCustomerPersonId({ formData }: { formData: FormData }): Promise<DatabaseResult & { enable: boolean }> {
  const { valid, errors } = basicCustomerValidation(formData)

  if (!valid) {
    return {
      enable: false,
      success: false,
      message: "Por favor corrige los errores en el formulario",
      error_code: "MISSING_REQUIRED_FIELDS",
      operation: "check_data",
      data: errors,
    }
  }
  const personId = formData.get("person_id") as string
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .select()
    .eq('person_id', removeFormatPersonId(personId))


  if (error) {
    return {
      success: false,
      message: "Ocurrió un error al verificar el DNI",
      error_code: 'UNEXPECTED_ERROR',
      operation: "check_data",
      enable: false
    }
  }

  if (data && data.length > 0) {
    // Si ya existe un cliente con este DNI, retornar el cliente encontrado
    return {
      error_code: "PERSON_ID_ALREADY_EXISTS",
      data: { existing_customer: data[0] },
      enable: false,
      message: "Ya existe un cliente con este DNI",
      operation: "check_data",
      success: false,
    }
  }


  return {
    data,
    enable: data.length === 0,
    message: "DNI disponible",
    operation: "check_data",
    success: true,
  }
}

export async function updateCustomer({ customerId, formData }: { customerId: string; formData?: FormData }): Promise<DatabaseResult> {
  const supabase = createClient()

  if (!formData) {
    return {
      success: false,
      message: "No se recibieron datos del formulario",
      error_code: 'MISSING_FORM_DATA',
      operation: "create",
    }
  }

  const firstName = formData.get("first_name") as string
  const lastName = formData.get("last_name") as string
  const personId = formData.get("person_id") as string
  const phone = formData.get("phone") as string
  const email = formData.get("email") as string

  const { data, error } = await supabase.from("customers")
    .update({
      first_name: firstName || null,
      last_name: lastName || null,
      person_id: removeFormatPersonId(personId) || null,
      phone: phone || null,
      email: email || null
    })
    .eq("id", customerId)
    .select()
    .single()

  if (error) {
    return {
      success: false,
      message: "Ocurrió un error al procesar la solicitud",
      error_code: 'UNEXPECTED_ERROR',
      operation: "create",
    }
  }

  const customer = data as Customer

  return {
    success: true,
    operation: "created",
    message: "Cliente actualizado correctamente",
    data: { customer }
  }
}

// TODO: quizas se pueda eliminar
interface UpsertCustomerParams {
  customerId?: string,
  formDataCustomer?: FormData
  formDataMembership?: FormData
}

export async function upsertCustomer({ customerId, formDataCustomer, formDataMembership }: UpsertCustomerParams): Promise<DatabaseResult & { customer?: Customer }> {
  if (!formDataCustomer) {
    return {
      success: false,
      message: "No se recibieron datos del formulario de cliente",
      error_code: 'MISSING_FORM_DATA',
      operation: "create",
    }
  }
  if (!formDataMembership) {
    return {
      success: false,
      message: "No se recibieron datos del formulario de membresía",
      error_code: 'MISSING_FORM_DATA',
      operation: "create",
    }
  }

  // Extraer datos del formulario
  const firstName = formDataCustomer.get("first_name") as string
  const lastName = formDataCustomer.get("last_name") as string
  const personId = formDataCustomer.get("person_id") as string
  const phone = formDataCustomer.get("phone") as string
  const email = formDataCustomer.get("email") as string
  const membershipType = formDataMembership.get("membership_type") as string
  const firstAssistance = formDataMembership.get("first_assistance") as 'on' | null
  const startDate = formDataMembership.get("start_date") as string
  const endDate = formDataMembership.get("end_date") as string
  const supabase = createClient()
  const { data, error } = await supabase.rpc("upsert_customer_with_membership", {
    p_customer_id: customerId || null,
    p_first_name: firstName || null,
    p_last_name: lastName || null,
    p_person_id: removeFormatPersonId(personId) || null,
    p_phone: phone || null,
    p_email: email || null,
    p_membership_type: membershipType,
    p_last_payment_date: startDate || null,
    p_expiration_date: endDate || null,
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

export async function upsertCustomerMembership({ customerId, formData }: {
  customerId: string,
  formData?: FormData
}): Promise<DatabaseResult> {
  if (!formData) {
    return {
      success: false,
      message: "No se recibieron datos del formulario",
      error_code: 'MISSING_FORM_DATA',
      operation: "create",
    }
  }

  const { errors, valid } = basicMembershipValidation(formData)

  if (!valid) {
    return {
      success: false,
      error_code: "MISSING_REQUIRED_FIELDS",
      message: "Por favor corrige los errores en el formulario",
      operation: "update",
      data: errors,
    }
  }

  const supabase = createClient()
  const startDate = formData.get("start_date") as string
  const endDate = formData.get("end_date") as string
  const membershipType = formData.get("membership_type") as string
  const payment = formData.get("payment") as 'on' | null
  const isPaid = payment === 'on' ? true : false

  // creck if exist customer_membership for customer
  const { data: existingMembership } = await supabase
    .from("customer_membership")
    .select()
    .eq("customer_id", customerId)
    .single()

  let result

  if (!existingMembership) {
    // If no existing membership, create a new one
    const { data: newMembership, error: createError } = await supabase
      .from("customer_membership")
      .insert({
        customer_id: customerId,
        membership_type: membershipType,
        last_payment_date: isPaid ? startDate : null,
        expiration_date: isPaid ? endDate : null
      })
      .select()
      .single()

    if (createError) {
      return {
        success: false,
        error_code: "CREATE_MEMBERSHIP_ERROR",
        message: "Error al crear la membresía: " + createError.message,
        operation: "create"
      }
    }

    result = newMembership
  } else {
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
    result = updatedMembership

  }


  return {
    success: true,
    operation: "updated",
    message: "Membresía actualizada correctamente",
    data: result
  }

}
