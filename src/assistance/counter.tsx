import { getTotalAssistancesToday } from "@/assistance/api/server";
import EyeIcon from "@/components/icons/eye";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ASSISTANCES } from "@/consts/routes";
import Link from "next/link";

export default async function AssistanceCounter() {
  const count = await getTotalAssistancesToday();

  return (
    <section className="flex flex-col justify-center mt-10 gap-1 ">
      <div className="mx-auto size-[90px] sm:size-[100px] rounded-full text-center shadow bg-primary/20 flex items-center justify-center relative">
        <span className="text-3xl sm:text-4xl leading-5 sm:leading-6 font-bold">
          {count === 0 ? "-" : count}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 absolute right-2 bottom-0"
        >
          <Link href={ASSISTANCES}>
            <EyeIcon className="size-6" />
          </Link>
        </Button>
      </div>
      <span className="mx-auto text-md font-bold">
        {count === 1 && "Asistencia"}
        {count > 1 && "Asistencias"}
        {count === 0 && "Sin asistencias"}
      </span>
    </section>
  );
}
export const AssistanceCounterLoader = () => {
  return (
    <section className="flex flex-col justify-center mt-10 gap-1 ">
      <Skeleton className="mx-auto size-[90px] sm:size-[100px] rounded-full" />
      <Skeleton className=" mx-auto w-32 h-6" />
    </section>
  );
};
