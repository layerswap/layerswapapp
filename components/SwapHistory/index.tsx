import { useRouter } from "next/router"
import { useCallback } from "react"
import HeaderWithMenu from "../HeaderWithMenu";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import dynamic from "next/dynamic";
import Snippet from "./HistoryComponent/Snippet";
import { HistorySwapProvider } from "../../context/historyContext";

const Content = dynamic(() => import("./HistoryComponent/History"), {
  loading: () => <Snippet />
})

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
      <div className='bg-secondary-900 sm:shadow-card pb-4 rounded-lg w-full text-primary-text overflow-hidden relative h-screen sm:h-[650px]'>
        <HeaderWithMenu goBack={goBack} />
        <div className="px-6 h-full sm:max-h-[92%] overflow-y-auto styled-scroll" id='virtualListContainer'>
          <Content
            loadExplorerSwaps={true}
          />
        </div>
        <div id="widget_root" />
      </div>
    </HistorySwapProvider>
  )
}

export default TransactionsHistory;