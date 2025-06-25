import SearchIcon from '@/components/icons/search'
import { Input } from '@/components/ui/input'

export default function Search() {
  return (
    <Input
      autoComplete={'off'}
      className="py-2 pl-0 mt-6"
      componentLeft={<SearchIcon className="size-6" />}
      placeholder="Búsqueda de clientes"
      variant={'line'}
    />
  )
}
