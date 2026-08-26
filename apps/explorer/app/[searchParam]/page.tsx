import BackBtn from "@/helpers/BackButton";
import SearchData from "./SearchData";

export default async function Page({ params }: { params: Promise<{ searchParam: string }> }) {
  const { searchParam } = await params;

  return (
    <main className="w-full py-5 px-6 xl:px-0">
      <div className="relative z-30 w-full px-4 sm:px-6 lg:px-8">
        <div className="-ml-3 mb-1 w-fit">
          <BackBtn />
        </div>
      </div>
      <SearchData searchParam={decodeURIComponent(searchParam)} />
    </main>
  )
}
