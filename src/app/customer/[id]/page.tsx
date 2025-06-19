import ArrowLeftIcon from "@/components/icons/arrow-left";
import { Button } from "@/components/ui/button";
import { searchCustomersById } from "@/customer/api/server";
import InfoResume from "@/customer/info-resume";
import Link from "next/link";

interface Props {
  params: {
    id: string;
  };
}

export default async function CustomerDetailPage({ params: { id } }: Props) {
  const { customer } = await searchCustomersById(id);

  if (!customer) {
    return (
      <div className="max-w-3xl mx-auto w-full px-4 py-6">
        <h2 className="text-lg font-semibold">Cliente no encontrado</h2>
      </div>
    );
  }

  return (
    <>
      <header className="max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary">
        <div className="flex gap-4 items-center">
          <Button variant="ghost" size="icon" className="size-6 rounded-full">
            <Link href={"/customer"}>
              <ArrowLeftIcon className="size-6" />
            </Link>
          </Button>
          <h5 className="font-medium text-sm">Perfil del cliente</h5>
        </div>
      </header>
      <section className="max-w-3xl mx-auto w-full px-4 overflow-auto pb-4">
        <h2 className="text-2xl font-semibold mt-6 mb-12">
          {customer.first_name} {customer.last_name}
        </h2>
        <InfoResume customer={customer} />
      </section>
    </>
  );
}
