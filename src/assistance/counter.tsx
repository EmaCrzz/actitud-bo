import { getTotalAssistancesToday } from "@/assistance/api/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function AssistanceCounter() {
  const count = await getTotalAssistancesToday();

  return (
    <section className="flex flex-col justify-center mt-10 gap-1">
      <div className="mx-auto size-[100px] rounded-full text-center shadow bg-primary/20 flex items-center justify-center">
        <span className="text-4xl leading-6 font-bold">
          {count === 0 ? "-" : count}
        </span>
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
    <section className="flex flex-col justify-center mt-10 gap-1">
      <Skeleton className="mx-auto size-[100px] rounded-full" />
      <Skeleton className=" mx-auto w-32 h-6" />
    </section>
  );
};
