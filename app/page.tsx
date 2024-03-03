import {MessagesTable} from "@/components/messages-table";
import MessagesTable2 from "./messages-table/messages-table";

export default function IndexPage() {

  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex flex-col items-start gap-2">
        <h1 className="text-3xl font-extrabold md:text-4xl">
          Microsoft 365 Message Center Archive</h1>
        <p className="text-lg text-muted-foreground">
          This site is an archive of Microsoft 365 Message Center messages for quick reference.
        </p>
      </div>

      <div className="">
        {/* <MessagesTable /> */}
        <MessagesTable2 />
      </div>
    </section>
  )
}
