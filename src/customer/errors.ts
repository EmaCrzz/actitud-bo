import {
  DatabaseError,
  PersonIdConflictError,
} from "@/types/database-errors"
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { toast } from "sonner";

export function handleDatabaseError(error: DatabaseError, router?: AppRouterInstance) {
  if (error.error_code === "MISSING_REQUIRED_FIELDS") {
    return error.data
  }
  if (error.error_code === "INVALID_MEMBERSHIP_TYPE") {
    return { membership_type: error.message }
  }
  if (error.error_code === "PERSON_ID_ALREADY_EXISTS") {
    const conflictError = error as PersonIdConflictError;

    toast.warning('Este DNI ya existe:', {
      description: `${conflictError.data.existing_customer.first_name} ${conflictError.data.existing_customer.last_name}`,
      action: {
        label: 'Ver cliente',
        onClick: () => {
          if (router) {
            router.push(`/customer/${conflictError.data.existing_customer.id}`)
          }
        }
      },
    })

    return
  }
}