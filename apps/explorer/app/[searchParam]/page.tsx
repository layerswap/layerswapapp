import SearchData from "./SearchData";

export default async function Page({ params }: { params: Promise<{ searchParam: string }> }) {
  const { searchParam } = await params;

  return (
    <main className="w-full pb-5 px-4 lg:px-0">
      <SearchData searchParam={decodeURIComponent(searchParam)} />
    </main>
  )
}
