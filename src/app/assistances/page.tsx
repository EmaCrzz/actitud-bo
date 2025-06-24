import { getTodayAssistances } from "@/assistance/api/server";
import FooterNavigation from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HOME } from "@/consts/routes";
import { formatPersonId } from "@/lib/format-person-id";
import { ArrowLeftIcon, CalendarCheck } from "lucide-react";
import Link from "next/link";

export default async function page() {
  const data = await getTodayAssistances();

  return (
    <>
      <header className="max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4">
        <div className="flex gap-4 items-center">
          <Button variant="ghost" size="icon" className="size-6 rounded-full">
            <Link href={HOME}>
              <ArrowLeftIcon className="size-6" />
            </Link>
          </Button>
          <h5 className="font-medium text-sm">Asistencias del dia</h5>
        </div>
      </header>
      <section className="max-w-3xl mx-auto w-full px-4 overflow-auto py-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white/70">
              <CalendarCheck className="h-5 w-5 text-yellow-600" />
              Asistencias del dia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.customers.map((customer, index) => (
              <div
                key={customer.person_id}
                className="flex items-center justify-between p-3 bg-inputhover rounded"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary200 rounded-full">
                    <span className="text-sm font-bold text-white/70">
                      #{index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-300">
                      {customer.first_name} {customer.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      DNI: {formatPersonId(customer.person_id)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
      <FooterNavigation />
    </>
  );
}
