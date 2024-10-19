import { useRouter } from "next/router"
import { useCallback } from "react"
import HeaderWithMenu from "../HeaderWithMenu";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import Content from "./HistoryComponent/History"

function TransactionsHistory() {

  const router = useRouter();

  const goBack = useCallback(() => {
    window?.['navigation']?.['canGoBack'] ?
      router.back()
      : router.push({
        pathname: "/",
        query: resolvePersistantQueryParams(router.query)
      })
  }, [router])

  return (
    <div id="widget" className='bg-secondary-900 sm:shadow-card pb-4 sm:relative rounded-lg w-full text-primary-text overflow-hidden  h-full sm:h-[650px]'>
      <div className="py-3 overflow-y-auto flex flex-col h-full z-40  pb-6">
        <HeaderWithMenu goBack={goBack} />
        <div className="px-6 h-full overflow-y-auto styled-scroll max-h-[80vh]" id='virtualListContainer'>
          <Content />
        </div>
      </div>
      <div id="widget_root" />
    </div>
  )
}

export default TransactionsHistory;