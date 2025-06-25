import ArrowLeftIcon from "@/components/icons/arrow-left";
import { Button } from "@/components/ui/button";
import { CUSTOMER } from "@/consts/routes";
import { searchCustomersById } from "@/customer/api/server";
import CustomerForm from "@/customer/form";
import Link from "next/link";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await searchCustomersById(id);

  if (!customer) {
    return (
      <div className="max-w-3xl mx-auto w-full px-4 py-6">
        <h2 className="text-lg font-semibold">Cliente no encontrado</h2>
      </div>
    );
  }

  return (
    <>
      <header className="max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4">
        <div className="flex gap-4 items-center">
          <Button className="size-6 rounded-full" size="icon" variant="ghost">
            <Link href={`${CUSTOMER}/${customer.id}`}>
              <ArrowLeftIcon className="size-6" />
            </Link>
          </Button>
          <h5 className="font-medium text-sm">Editar datos</h5>
        </div>
      </header>
      <CustomerForm customer={customer} />
    </>
  );
}
