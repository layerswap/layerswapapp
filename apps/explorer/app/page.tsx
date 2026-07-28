import Search from "@/components/Search";
import DataTable from "./DataTable";
import MaintananceContent from "@/components/maintanance/maintanance";

export default async function Home() {

  if (process.env.NEXT_PUBLIC_MAINTANANCE == String(true))
    return <MaintananceContent />

  return (
    <main className="w-full pb-5 px-6 xl:px-0 h-full flex flex-col">
      <div className="mx-auto w-full lg:px-8 flex flex-col">
        <Search />
      </div>
      <DataTable />
    </main>
  )
}