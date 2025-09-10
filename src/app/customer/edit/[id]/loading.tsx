import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function EditCustomerLoading() {
  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-2 sm:px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <ArrowLeftIcon className='size-6' />
          </Button>
          <h5 className='font-medium text-sm'>Editar Cliente</h5>
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-2 sm:px-4 overflow-auto pb-4 pt-12'>
        <h3 className='text-sm sm:text-md mb-4'>
          Puedes modificar el formulario para actualizar la información de este cliente.
        </h3>
        <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
          <div className='grid gap-y-2 col-span-2'>
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-[50px] w-full mb-4' />
          </div>
          <div className='grid gap-y-2 col-span-2'>
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-[50px] w-full mb-4' />
          </div>
          <div className='grid gap-y-2 col-span-2'>
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-[50px] w-full mb-4' />
          </div>
          <div className='grid gap-y-2 col-span-2'>
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-[50px] w-full mb-4' />
          </div>
        </div>
      </section>
      <footer className='flex justify-between max-w-3xl gap-2 mx-auto w-full px-4 pb-9'>
        <Button disabled className='w-full h-12'>
          Confirmar
        </Button>
      </footer>
    </>
  )
}
