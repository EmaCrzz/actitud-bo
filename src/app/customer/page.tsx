import BackButton from "@/assistance/back-button";
import PlusRoundedIcon from "@/components/icons/plus-rounded";

import FooterNavigation from "@/components/nav";
import { Button } from "@/components/ui/button";
import { searchAllCustomers } from "@/customer/api";
import ListCustomers from "@/customer/list";
import { Suspense } from "react";

export default async function CustomerListPage() {
  // TODO: Implement pagination infinite scroll
  const customers = await searchAllCustomers();

  return (
    <>
      <header className="max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary">
        <div className="flex gap-4 items-center">
          <Suspense>
            <BackButton />
          </Suspense>
          <h5 className="font-medium text-sm">Lista de clientes</h5>
        </div>
      </header>
      <section className="max-w-3xl mx-auto w-full px-4 overflow-auto pb-4">
        <Button variant={"link"} className="flex justify-start h-14 pl-0!">
          <PlusRoundedIcon className="size-6" />
          <span>Crear nuevo cliente</span>
        </Button>
        <ListCustomers customers={customers} />
      </section>
      <FooterNavigation />
    </>
  );
}
