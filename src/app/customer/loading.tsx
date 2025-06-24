import ArrowLeftIcon from "@/components/icons/arrow-left";
import PlusRoundedIcon from "@/components/icons/plus-rounded";

import FooterNavigation from "@/components/nav";
import { Button } from "@/components/ui/button";
import { HOME } from "@/consts/routes";
import { CustomerListLoading } from "@/customer/list";
import Link from "next/link";

export default async function CustomerListLoadingPage() {
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
        <Button variant={"link"} className="h-14 pl-0!" disabled>
          <PlusRoundedIcon className="size-6" />
          <span>Crear nuevo cliente</span>
        </Button>
        <CustomerListLoading />
      </section>
      <FooterNavigation />
    </>
  );
}
