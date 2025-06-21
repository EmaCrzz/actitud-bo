import ArrowLeftIcon from "@/components/icons/arrow-left";
import { Button } from "@/components/ui/button";
import { HOME } from "@/consts/routes";
import CustomerForm from "@/customer/form";
import Link from "next/link";

export default async function EditCustomerPage() {
  return (
    <>
      <header className="max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4">
        <div className="flex gap-4 items-center">
          <Button variant="ghost" size="icon" className="size-6 rounded-full">
            <Link href={HOME}>
              <ArrowLeftIcon className="size-6" />
            </Link>
          </Button>
          <h5 className="font-medium text-sm">Crear un nuevo Cliente</h5>
        </div>
      </header>
      <CustomerForm />
    </>
  );
}
