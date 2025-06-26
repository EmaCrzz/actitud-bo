/* eslint-disable @typescript-eslint/no-explicit-any */
export type DatabaseErrorCode =
  | "MISSING_REQUIRED_FIELDS"
  | "PERSON_ID_ALREADY_EXISTS"
  | "PERSON_ID_CONFLICT"
  | "CUSTOMER_NOT_FOUND"
  | "INVALID_MEMBERSHIP_TYPE"
  | "UNEXPECTED_ERROR"

export interface DatabaseError {
  success: false
  error_code: DatabaseErrorCode
  message: string
  operation: "create" | "update"
  data?: Record<string, any>
}

export interface DatabaseSuccess<T = any> {
  success: true
  operation: "created" | "updated"
  message: string
  data: T
}

export type DatabaseResult<T = any> = DatabaseSuccess<T> | DatabaseError

// Tipos específicos para errores de cliente
export interface PersonIdConflictError extends DatabaseError {
  error_code: "PERSON_ID_ALREADY_EXISTS" | "PERSON_ID_CONFLICT"
  data: {
    existing_customer: {
      id: string
      first_name: string
      last_name: string
      person_id: string
      email?: string
      phone?: string
    }
    conflicting_person_id: string
    current_customer_id?: string
  }
}

export interface MissingFieldsError extends DatabaseError {
  error_code: "MISSING_REQUIRED_FIELDS"
  data: {
    missing_fields: string[]
  }
}

export interface InvalidMembershipError extends DatabaseError {
  error_code: "INVALID_MEMBERSHIP_TYPE"
  data: {
    invalid_membership_type: string
    available_types: string[]
  }
}
