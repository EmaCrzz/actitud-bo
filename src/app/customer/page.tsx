import ArrowLeftIcon from "@/components/icons/arrow-left";
import PlusRoundedIcon from "@/components/icons/plus-rounded";

import FooterNavigation from "@/components/nav";
import { Button } from "@/components/ui/button";
import { CUSTOMER_NEW, HOME } from "@/consts/routes";
import { searchAllCustomers } from "@/customer/api/server";
import ListCustomers from "@/customer/list";
import Link from "next/link";

export default async function CustomerListPage() {
  // TODO: Implement pagination infinite scroll
  const customers = await searchAllCustomers();

  return (
    <>
      <header className="max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4">
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
        <Button variant={"link"} className="h-14 pl-0!">
          <Link href={CUSTOMER_NEW} className="flex justify-start gap-x-2 items-center">
            <PlusRoundedIcon className="size-6" />
            <span>Crear nuevo cliente</span>
          </Link>
        </Button>
        <ListCustomers customers={customers} />
      </section>
      <FooterNavigation />
    </>
  );
}
