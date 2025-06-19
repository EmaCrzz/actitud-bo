"use client";

import CustomerCounter from "@/assistance/customer-counter";
import RegistryBtn from "@/assistance/registry-button";
import { MEMBERSHIP_TYPE_5_DAYS } from "@/assistance/consts";
import { useState } from "react";
import { createAssistance } from "./api/client";
import { toast } from "sonner";
import { CustomerWithAssistance } from "@/customer/types";

export default function CustomerAssistance({
  customer,
}: {
  customer: CustomerWithAssistance;
}) {
  const [isPending, setIsPending] = useState(false);
  const [daySelected, setDaySelected] = useState<string>();

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
  };

  return (
    <>
      <div className="grow">
        <p className="text-lg">Membresía de:</p>
        <hr className="my-2 border-primary" />
        <p className="text-lg">5 días</p>
        <CustomerCounter
          assistanceCount={customer.assistance.length}
          membershipType={MEMBERSHIP_TYPE_5_DAYS}
          handleSelectedDay={handleSelectedDay}
          selectedDay={daySelected}
        />
      </div>
      <RegistryBtn
        disabled={!daySelected}
        onClick={handleSubmit}
        loading={isPending}
        loadingText="Un momento"
      />
    </>
  );
}
