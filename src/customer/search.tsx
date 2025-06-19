import SearchIcon from "@/components/icons/search";
import { Input } from "@/components/ui/input";

export default function Search() {
  return (
    <Input
      className="py-2 pl-0 mt-6"
      autoComplete={"off"}
      variant={"line"}
      placeholder="Búsqueda de clientes"
      componentLeft={<SearchIcon className="size-6" />}
    />
  );
}
