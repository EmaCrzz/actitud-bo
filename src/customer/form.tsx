"use client";

import SelectMembership from "@/components/select-membership";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersonIdInput } from "@/components/ui/input-person-id";
import { Label } from "@/components/ui/label";
import { CustomerComplete } from "@/customer/types";
import { CustomerFormResponse, upsertCustomer } from "@/customer/api/client";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";

export default function CustomerForm({
  customer,
}: {
  customer?: CustomerComplete;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<CustomerFormResponse["errors"]>();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors(undefined);
    const formData = new FormData(event.currentTarget);
    setLoading(true);

    const {
      errors,
      message,
      success,
      customer: customerResponse,
    } = await upsertCustomer({
      customerId: customer?.id || "",
      formData,
    });
    setLoading(false);

    if (success && customerResponse) {
      toast.success(message);
      router.push(`/customer/${customerResponse.id}`);
      return;
    }

    if (errors || !success) {
      toast.error(message);
      setErrors(errors);
      return;
    }
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
          <div className="grid gap-y-4">
            <div className="grid gap-y-2">
              <Label className="font-light" htmlFor="assistance">
                Nombre
              </Label>
              <Input
                isInvalid={!!errors?.first_name}
                helperText={errors?.first_name?.[0]}
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
                isInvalid={!!errors?.last_name}
                helperText={errors?.last_name?.[0]}
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
                isInvalid={!!errors?.person_id}
                helperText={errors?.person_id?.[0]}
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
                defaultValue={
                  customer?.customer_membership?.membership_type || ""
                }
                className="font-light"
                isInvalid={!!errors?.membership_type}
                helperText={errors?.membership_type?.[0]}
              />
            </div>
            <div className="grid gap-y-2">
              <Label className="font-light" htmlFor="assistance">
                Contacto telefónico
              </Label>
              <Input name={"phone"} defaultValue={customer?.phone || ""} />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="first-assistance"
                name="first-assistance"
                className="size-6"
              />
              <Label className="text-xs text-white" htmlFor="first-assistance">
                Registrar su primer asistencia
              </Label>
            </div>
          </div>
        </section>
      </form>
      <footer className="flex justify-between max-w-3xl gap-2 mx-auto w-full px-4 pb-9">
        <Button
          loading={loading}
          onClick={() => router.back()}
          className="w-36 h-12 sm:w-44 sm:h-14"
          variant="outline"
        >
          Cancelar
        </Button>
        <Button
          loading={loading}
          type="submit"
          form="form-edit"
          className="w-36 h-12 sm:w-44 sm:h-14"
        >
          Guardar
        </Button>
      </footer>
    </>
  );
}
