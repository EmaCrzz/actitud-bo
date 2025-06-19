"use client";

import { Button } from "@/components/ui/button";
import ArrowLeftIcon from "@/components/icons/arrow-left";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertCancelAssintance } from "./cancel-dialog";

export default function BackButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const day = searchParams.get("day");
  const [isOpen, setIsOpen] = useState(false);

  const handleBack = () => {
    // Navigate back to the previous page or a specific route
    if (day) {
      setIsOpen(true);
    } else {
      router.replace("/");
    }
  };

  const handleConfirmCancel = () => {
    // Logic to handle the confirmation of cancellation
    // For example, you might want to reset the day or perform some cleanup
    console.log("Assistance cancelled for day:", day);
    setIsOpen(false);
    router.replace("/");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 rounded-full"
        onClick={handleBack}
      >
        <ArrowLeftIcon className="size-6" />
      </Button>
      <AlertCancelAssintance
        handleConfirmCancel={handleConfirmCancel}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    </>
  );
}
