import MessagesTable2 from "./messages-table/messages-table";

export default function IndexPage() {

  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex min-w-0 flex-col items-start gap-2">
        <h1 className="max-w-full text-2xl font-extrabold leading-tight md:text-3xl">
          Microsoft 365 Message Center and Roadmap Archive</h1>
        <p className="max-w-full text-base text-muted-foreground md:text-lg">
          This site archives Microsoft 365 Message Center and Roadmap posts for reference. Message Center posts vary by tenant; always use your tenant&apos;s Message Center as the source of truth.
        </p>
      </div>

      <div className="min-w-0">
        <MessagesTable2 />
      </div>
    </section>
  )
}
