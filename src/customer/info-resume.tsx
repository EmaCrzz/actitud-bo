import { Label } from "@/components/ui/label";
import EditButton from "@/customer/edit-button";

export default function InfoResume() {
  return (
    <>
      <Label className="font-light text-xs leading-6">Datos Personales</Label>
      <section className="p-4 grid gap-y-8 bg-card rounded-[4px]">
        <div className="flex justify-between">
          <div className="grid gap-y-2">
            <Label className="font-light text-xs leading-6">
              Nombre y apellido
            </Label>
            <span className="font-medium leading-6">Luna Duarte</span>
          </div>
          <EditButton />
        </div>
        <div className="grid gap-y-2">
          <Label className="font-light text-xs leading-6">DNI</Label>
          <span className="font-medium leading-6">30.300.400</span>
        </div>
        <div className="grid gap-y-2">
          <Label className="font-light text-xs leading-6">
            Tipo de Membresía
          </Label>
          <span className="font-medium leading-6">5 días</span>
        </div>
        <div className="grid gap-y-2">
          <Label className="font-light text-xs leading-6">
            Contacto telefónico
          </Label>
          <span className="font-medium leading-6">343-4555666</span>
        </div>
      </section>
    </>
  );
}
