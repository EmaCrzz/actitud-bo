import { searchCustomersById } from "@/customer/api/server";
import CustomerForm from "@/customer/form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await searchCustomersById(id);

  if (!customer) {
    return (
      <div className="max-w-3xl mx-auto w-full px-2 sm:px-4 py-6">
        <h2 className="text-lg font-semibold">Cliente no encontrado</h2>
      </div>
    );
  }

  return <CustomerForm customer={customer} />
}
