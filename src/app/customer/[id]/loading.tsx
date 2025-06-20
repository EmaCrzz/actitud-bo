import ArrowLeftIcon from "@/components/icons/arrow-left";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CUSTOMER } from "@/consts/routes";
import Link from "next/link";

export default function CustomerDetailPageLoading() {
  return (
    <>
      <header className="max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4">
        <div className="flex gap-4 items-center">
          <Button variant="ghost" size="icon" className="size-6 rounded-full">
            <Link href={CUSTOMER}>
              <ArrowLeftIcon className="size-6" />
            </Link>
          </Button>
          <h5 className="font-medium text-sm">Perfil del cliente</h5>
        </div>
      </header>
      <section className="max-w-3xl mx-auto w-full px-4 overflow-auto pb-4">
        <Skeleton className="mt-6 mb-12 h-8 w-1/3 " />
        <Skeleton className=" w-1/3 h-4 mb-2" />
        <section className="p-4 grid gap-y-8 bg-card rounded-[4px]">
          <div className="flex justify-between">
            <div className="grid gap-y-2">
              <Skeleton className="h-4 mb-2 w-30" />
              <Skeleton className="h-8 w-60" />
            </div>
          </div>
          <div className="grid gap-y-2">
            <div className="grid gap-y-2">
              <Skeleton className="h-4 mb-2 w-30" />
              <Skeleton className="h-8 w-54" />
            </div>
          </div>
          <div className="grid gap-y-2">
            <div className="grid gap-y-2">
              <Skeleton className="h-4 mb-2 w-30" />
              <Skeleton className="h-8 w-64" />
            </div>
          </div>
          <div className="grid gap-y-2">
            <div className="grid gap-y-2">
              <Skeleton className="h-4 mb-2 w-30" />
              <Skeleton className="h-8 w-56" />
            </div>
          </div>
        </section>
      </section>
    </>
  );
}
