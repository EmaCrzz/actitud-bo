"use client";

import CustomerCounter from "@/assistance/customer-counter";
import RegistryBtn from "@/assistance/registry-button";
import { MEMBERSHIP_TYPE_5_DAYS } from "@/assistance/consts";
import { useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

export default function CustomerAssistance() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const day = searchParams.get('day')
  const [isPending, setIsPending] = useState(false);

  const handleSelectedDay = (day: string) => {
    // Update the URL with the selected day
    const params = new URLSearchParams(searchParams.toString());
    params.set('day', day);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSubmit = async () => {
    // simulate a delay for the registry
    setIsPending(true)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Here you would typically handle the registry logic, e.g., API call
    console.log(`Registered for day ${day}`);
    setIsPending(false)
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
          selectedDay={day}
        />
      </div>
      <RegistryBtn disabled={!day} onClick={handleSubmit} loading={isPending} loadingText="Un momento" />
    </>
  );
}
