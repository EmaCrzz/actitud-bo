import { TranslationKey, TranslationParams } from '@/lib/i18n/types'
import { DatabaseError, PersonIdConflictError } from '@/types/database-errors'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { toast } from 'sonner'

type TranslationFunction = (key: TranslationKey, params?: TranslationParams) => string

export function handleDatabaseError(
  error: DatabaseError,
  router?: AppRouterInstance,
  t?: TranslationFunction
) {
  // Handle field-level validation errors
  if (error.error_code === 'MISSING_REQUIRED_FIELDS') {
    toast.error(error.message)

    return error.data
  }

  if (error.error_code === 'INVALID_MEMBERSHIP_TYPE') {
    toast.error(error.message)

    return { membership_type: error.message }
  }

  if (error.error_code === 'INVALID_AMOUNT') {
    toast.error(error.message)

    return { membership_amount: error.message }
  }

  // Handle customer conflicts
  if (error.error_code === 'PERSON_ID_ALREADY_EXISTS') {
    const conflictError = error as PersonIdConflictError

    toast.warning(t ? t('customer.errors.personIdExists') : 'Este DNI ya existe:', {
      description: `${conflictError.data.existing_customer.first_name} ${conflictError.data.existing_customer.last_name}`,
      action: {
        label: t ? t('common.viewCustomer') : 'Ver cliente',
        onClick: () => {
          if (router) {
            router.push(`/customer/${conflictError.data.existing_customer.id}`)
          }
        },
      },
    })

    return {
      person_id: t ? t('customer.errors.personIdAlreadyRegistered') : 'Este DNI ya esta registrado',
    }
  }

  // Handle assistance errors
  if (error.error_code === 'ASSISTANCE_ALREADY_EXISTS') {
    toast.error(error.message)

    return { first_assistance: error.message }
  }

  // Handle general errors with toast notifications
  if (error.error_code === 'CUSTOMER_NOT_FOUND') {
    toast.error(error.message)
  }

  if (error.error_code === 'MISSING_CUSTOMER_ID') {
    toast.error(error.message)
  }

  if (error.error_code === 'MISSING_MEMBERSHIP_TYPE') {
    toast.error(error.message)
  }

  if (error.error_code === 'UNEXPECTED_ERROR') {
    toast.error(error.message)
  }

  if (error.error_code === 'RPC_ERROR') {
    toast.error(error.message, {
      description: error.data?.hint || error.data?.details,
    })
  }

  if (error.error_code === 'OPERATION_FAILED') {
    toast.error(error.message)
  }

  if (error.error_code === 'CREATE_MEMBERSHIP_ERROR') {
    toast.error(error.message)
  }

  if (error.error_code === 'UPDATE_MEMBERSHIP_ERROR') {
    toast.error(error.message)
  }

  if (error.error_code === 'CREATE_PAYMENT_ERROR') {
    toast.error(error.message)
  }

  if (error.error_code === 'MISSING_FORM_DATA') {
    toast.error(error.message)
  }

  return undefined
}
