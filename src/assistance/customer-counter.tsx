import { cn } from "@/lib/utils";
import { MembershipType } from "./consts";

interface Porps {
  membershipType: MembershipType;
  assistanceCount?: number;
  selectedDay?: string;
  isDisabled?: boolean;
  handleSelectedDay?: (day: string) => void;
}

export default function CustomerCounter({
  membershipType,
  assistanceCount = 1,
  selectedDay = undefined,
  isDisabled = false,
  handleSelectedDay,
}: Porps) {
  const items = membershipType === "MEMBERSHIP_TYPE_5_DAYS" ? 5 : 3;

  return (
    <>
      <p className="text-lg mt-5">Asistencias de la semana</p>
      <hr className="mt-2 mb-4 border-primary" />
      <div className="flex gap-6 items-center">
        {Array.from({ length: items }).map((_, index) => {
          const isChecked =
            index < assistanceCount || index + 1 === Number(selectedDay);
          const enabled = assistanceCount + 1 === index + 1 && !isDisabled;

          return (
            <span
              key={index}
              className={cn(
                "size-14 rounded-full flex items-center justify-center transition-colors",
                isChecked
                  ? enabled
                    ? "bg-primary text-white hover:cursor-pointer border border-white"
                    : "bg-primary text-white hover:cursor-not-allowed"
                  : enabled
                  ? "bg-white text-background hover:cursor-pointer hover:bg-white/90"
                  : "bg-white text-background hover:cursor-not-allowed"
              )}
              onClick={() => {
                if (!enabled) return;
                handleSelectedDay?.(String(index + 1));
              }}
            >
              <span className="font-medium">{index + 1}</span>
            </span>
          );
        })}
      </div>
    </>
  );
}
