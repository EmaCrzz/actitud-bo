import { Button, type ButtonProps } from "@/components/ui/button";

export default function RegistryBtn(props: ButtonProps) {
  return (
    <Button className="h-14 w-full" {...props}>
      Registrar asistencia
    </Button>
  );
}
