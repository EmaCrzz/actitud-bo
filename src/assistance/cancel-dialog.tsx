import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  handleConfirmCancel?: () => void;
}

export function AlertCancelAssintance({
  isOpen,
  setIsOpen,
  handleConfirmCancel,
}: Props) {
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-[360px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Quieres cancelar la asistencia del día?
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid grid-cols-2 gap-4">
          <AlertDialogCancel
            onClick={() => handleConfirmCancel && handleConfirmCancel()}
            className="h-14 rounded-[4px]"
          >
            Si, cancelar
          </AlertDialogCancel>
          <AlertDialogAction className="h-14 rounded-[4px]">
            Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
