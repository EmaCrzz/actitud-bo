"use client";

import SelectMembership from "@/components/select-membership";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersonIdInput } from "@/components/ui/input-person-id";
import { Label } from "@/components/ui/label";
import { Customer } from "@/customer/types";
import { upsertCustomer } from "@/customer/api/client";

export default function CustomerForm({ customer }: { customer?: Customer }) {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const { errors, message, success } = await upsertCustomer({
      customerId: customer?.id || "",
      formData,
    });

    console.log({ errors, message, success });
  };

  return (
    <>
      <form onSubmit={handleSubmit} id="form-edit">
        <section className="max-w-3xl mx-auto w-full px-4 overflow-auto pb-4 pt-12">
          <h3 className="text-sm sm:text-md mb-4">
            {customer
              ? "Puedes modificar el formulario para actualizar la información de este cliente."
              : "Completá el formulario para dar de alta un nuevo cliente."}
          </h3>
          <div className="grid gap-y-8">
            <div className="grid gap-y-2">
              <Label className="font-light" htmlFor="assistance">
                Nombre
              </Label>
              <Input
                name={"first_name"}
                defaultValue={customer?.first_name || ""}
                className="w-full font-light"
              />
            </div>
            <div className="grid gap-y-2">
              <Label className="font-light" htmlFor="assistance">
                Apellido
              </Label>
              <Input
                name={"last_name"}
                defaultValue={customer?.last_name || ""}
                className="w-full font-light"
              />
            </div>
            <div className="grid gap-y-2">
              <Label className="font-light" htmlFor="assistance">
                DNI
              </Label>
              <PersonIdInput
                name={"person_id"}
                defaultValue={customer?.person_id || ""}
                className="w-full font-light"
              />
            </div>
            <div className="grid gap-y-2">
              <Label className="font-light" htmlFor="assistance">
                Tipo de membresía
              </Label>
              <SelectMembership
                name={"membership_type"}
                defaultValue={customer?.membership_type || ""}
                className="font-light"
              />
            </div>
            <div className="grid gap-y-2">
              <Label className="font-light" htmlFor="assistance">
                Contacto telefónico
              </Label>
              <Input name={"phone"} defaultValue={customer?.phone || ""} />
            </div>
          </div>
        </section>
      </form>
      <footer className="flex justify-between max-w-3xl mx-auto w-full px-4 pb-9">
        <Button className="w-44 h-14" variant="outline">
          Cancelar
        </Button>
        <Button type="submit" form="form-edit" className="w-44 h-14">
          Guardar
        </Button>
      </footer>
    </>
  );
}
