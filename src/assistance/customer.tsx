"use client";

import CustomerCounter from "@/assistance/customer-counter";
import RegistryBtn from "@/assistance/registry-button";
import { MEMBERSHIP_TYPE_5_DAYS } from "@/assistance/consts";
import { useState } from "react";
import { createAssistance } from "./api/client";
import { toast } from "sonner";
import { CustomerComplete } from "@/customer/types";
import { HOME } from "@/consts/routes";
import { useRouter } from "next/navigation";
import { Alert, AlertTitle } from "@/components/ui/alert";
import AlertContainedIcon from "@/components/icons/alert-contained";

export default function CustomerAssistance({
  customer,
}: {
  customer: CustomerComplete;
}) {
  const [isPending, setIsPending] = useState(false);
  const [daySelected, setDaySelected] = useState<string>();
  const router = useRouter();

  const handleSelectedDay = (day: string) => {
    setDaySelected(day);
  };

  const handleSubmit = async () => {
    setIsPending(true);
    const { error } = await createAssistance({ customer_id: customer.id });

    if (error?.code) {
      setIsPending(false);
      toast.error("Error al registrar asistencia, intente nuevamente", {
        description: error.message,
      });

      return;
    }
    setIsPending(false);
    toast.success("¡Listo, asistencia registrada!");
    router.push(HOME);
  };

  const today = new Date();
  const hasAssistanceToday = customer.assistance.some(
    (assistance) =>
      new Date(assistance.assistance_date).toDateString() ===
      today.toDateString()
  );

  return (
    <>
      <div className="grow">
        <p className="text-lg">Membresía de:</p>
        <hr className="my-2 border-primary bg-am" />
        <p className="text-lg">5 días</p>
        <CustomerCounter
          assistanceCount={customer.assistance.length}
          handleSelectedDay={handleSelectedDay}
          isDisabled={hasAssistanceToday}
          membershipType={MEMBERSHIP_TYPE_5_DAYS}
          selectedDay={daySelected}
        />
        {hasAssistanceToday && (
          <Alert className="mt-6" variant="destructive">
            <AlertContainedIcon />
            <AlertTitle className="font-secondary tracking-[0.48px]">
              Ya se registro una asistencia el dia de hoy
            </AlertTitle>
          </Alert>
        )}
      </div>
      <RegistryBtn
        disabled={!daySelected || hasAssistanceToday}
        loading={isPending}
        loadingText="Un momento"
        onClick={handleSubmit}
      />
    </>
  );
}
