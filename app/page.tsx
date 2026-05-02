import MessagesTable2 from "./messages-table/messages-table"

export default function IndexPage() {
  return (
    <section className="page-shell">
      <div className="page-intro min-w-0 items-start">
        <h1 className="page-title max-w-full md:text-4xl">
          Microsoft 365 Message Center and Roadmap Archive
        </h1>
        <p className="page-description max-w-full md:text-lg md:leading-8">
          This site archives Microsoft 365 Message Center and Roadmap posts for
          reference. Message Center posts vary by tenant; always use your
          tenant&apos;s Message Center as the source of truth.
        </p>
      </div>

      <div className="min-w-0">
        <MessagesTable2 />
      </div>
    </section>
  )
}
