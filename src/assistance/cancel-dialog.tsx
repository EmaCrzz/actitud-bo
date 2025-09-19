import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslations } from '@/lib/i18n/context';

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
  const { t } = useTranslations();

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-[360px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('assistance.cancelDialog.title')}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid grid-cols-2 gap-4">
          <AlertDialogCancel
            className="h-14 rounded-[4px]"
            onClick={() => handleConfirmCancel && handleConfirmCancel()}
          >
            {t('assistance.cancelDialog.confirmCancel')}
          </AlertDialogCancel>
          <AlertDialogAction className="h-14 rounded-[4px]">
            {t('assistance.cancelDialog.continue')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
