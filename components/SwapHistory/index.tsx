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
      <div className='max-h-full overflow-y-hidden group fixed inset-x-0 bottom-0 z-40 w-full   bg-secondary-900 h-full undefined shadow-lg'>
        <div className="py-3 overflow-y-auto flex flex-col h-full z-40  pb-6">
          <HeaderWithMenu goBack={goBack} />
          <div className="select-text max-h-full overflow-y-auto overflow-x-hidden styled-scroll px-6 h-full" id='virtualListContainer'>
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