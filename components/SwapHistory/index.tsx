import { useRouter } from "next/router"
import { useCallback } from "react"
import HeaderWithMenu from "../HeaderWithMenu";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import { HistorySwapProvider } from "../../context/historyContext";
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
    <HistorySwapProvider>
      <div className='bg-secondary-900 sm:shadow-card pb-4 sm:relative rounded-lg w-full text-primary-text overflow-hidden  h-full sm:h-[650px]'>
        <div className="overflow-y-auto flex flex-col h-full z-40  pb-6">
          <HeaderWithMenu goBack={goBack} />
          <div className="px-6 h-full overflow-y-auto styled-scroll max-h-[80vh]" id='virtualListContainer'>
            <Content
              loadExplorerSwaps={true}  
            />
          </div>
        </div>
        <div id="widget_root" />
      </div>
    </HistorySwapProvider>
  )
}

export default TransactionsHistory;