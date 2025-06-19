export default function AssistanceCounter() {
  return (
    <section className="flex flex-col justify-center mt-10 gap-1">
      <div className="mx-auto size-[100px] rounded-full text-center shadow bg-primary/20 flex items-center justify-center">
        <span className="text-4xl leading-6 font-bold">-</span>
      </div>
      <span className="mx-auto text-md font-bold">Sin asistencias</span>
    </section>
  );
}
