import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomerAssistance from "@/assistance/customer";
import InfoResume from "@/customer/info-resume";
import { Suspense } from "react";
import { searchCustomersById } from "@/customer/api/server";
import { Button } from "@/components/ui/button";
import ArrowLeftIcon from "@/components/icons/arrow-left";
import Link from "next/link";

export default async function AssintanceRegisterPage({
  params,
}: {
  params: Promise<{ customer_id: string }>;
}) {
  const { customer_id } = await params;
  const { customer } = await searchCustomersById(customer_id);

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
            <Link href={"/"}>
              <ArrowLeftIcon className="size-6" />
            </Link>
          </Button>
          <h5 className="font-medium text-sm">Registro de asistencias</h5>
        </div>
      </header>
      <section className="mt-6 px-4 flex flex-col max-w-3xl mx-auto w-full pb-4">
        <h3 className="text-2xl">
          {customer.first_name} {customer.last_name}
        </h3>
        <Tabs defaultValue="assistance" className="mt-10 grow">
          <TabsList className="rounded-full bg-primary w-full max-w-96 h-12">
            <TabsTrigger className="rounded-full" value="assistance">
              Asistencias
            </TabsTrigger>
            <TabsTrigger className="rounded-full" value="data">
              Datos
            </TabsTrigger>
          </TabsList>
          <TabsContent className="mt-10 flex flex-col" value="assistance">
            <Suspense>
              <CustomerAssistance customerId={customer_id} />
            </Suspense>
          </TabsContent>
          <TabsContent className="mt-10" value="data">
            <InfoResume customer={customer} />
          </TabsContent>
        </Tabs>
      </section>
    </>
  );
}
