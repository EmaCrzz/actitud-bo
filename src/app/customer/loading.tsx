import ArrowLeftIcon from "@/components/icons/arrow-left";
import PlusRoundedIcon from "@/components/icons/plus-rounded";
import SearchIcon from "@/components/icons/search";

import FooterNavigation from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HOME } from "@/consts/routes";
import Link from "next/link";

export default function CustomerListPageLoading() {
  return (
    <>
      <header className="max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary">
        <div className="flex gap-4 items-center">
          <Button variant="ghost" size="icon" className="size-6 rounded-full">
            <Link href={HOME}>
              <ArrowLeftIcon className="size-6" />
            </Link>
          </Button>
          <h5 className="font-medium text-sm">Lista de clientes</h5>
        </div>
      </header>
      <section className="max-w-3xl mx-auto w-full px-4 overflow-auto pb-4">
        <Button
          disabled
          variant={"link"}
          className="flex justify-start h-14 pl-0!"
        >
          <PlusRoundedIcon className="size-6" />
          <span>Crear nuevo cliente</span>
        </Button>
        <div className="bg-background sticky top-0 pb-1">
          <Input
            className="py-2 pl-0 mt-6"
            variant={"line"}
            disabled
            placeholder="Búsqueda de clientes"
            componentLeft={<SearchIcon className="size-6 text-primary200" />}
          />
        </div>
        <ul className="mt-6">
          {[...Array(8).keys()].map((i) => (
            <Skeleton
              key={i}
              className="h-12 w-full mb-2 rounded"
              style={{ width: "100%" }}
            />
          ))}
        </ul>
      </section>
      <FooterNavigation />
    </>
  );
}
