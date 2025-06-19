import IsoBlanco from "@/assets/logos/blanco/iso";
import AssistanceCounter from "@/assistance/counter";
import AutocompleteInput from "@/assistance/search";
import FooterNavigation from "@/components/nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  const today = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date());

  return (
    <>
      <header className="max-w-3xl mx-auto w-full px-4 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <div className="size-14 rounded-full bg-primary">
            <IsoBlanco className="size-14" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Hola, {data.user.email ?? '-'}</h3>
            <p className="font-medium text-xs capitalize">{today}</p>
          </div>
        </div>
        <div className="relative">
          <Avatar className="size-12">
            <AvatarFallback className="font-medium text-xs">MV</AvatarFallback>
          </Avatar>
          <div className="absolute left-2 bottom-0 size-2 bg-green-400 rounded-full" />
        </div>
      </header>
      <section className="max-w-3xl mx-auto w-full">
        <AssistanceCounter />
        <AutocompleteInput />
      </section>
      <FooterNavigation />
    </>
  );
}
