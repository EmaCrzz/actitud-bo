"use client";

import CustomerCounter from "@/assistance/customer-counter";
import RegistryBtn from "@/assistance/registry-button";
import { MEMBERSHIP_TYPE_5_DAYS } from "@/assistance/consts";
import { useState } from "react";

export default function CustomerAssistance() {
  const [isPending, setIsPending] = useState(false);
  const [daySelected, setDaySelected] = useState<string>();

  const handleSelectedDay = (day: string) => {
    setDaySelected(day);
  };

  const handleSubmit = async () => {
    setIsPending(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsPending(false);
  };

  return (
    <>
      <div className="grow">
        <p className="text-lg">Membresía de:</p>
        <hr className="my-2 border-primary" />
        <p className="text-lg">5 días</p>
        <CustomerCounter
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
