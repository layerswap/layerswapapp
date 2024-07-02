import { useRouter } from "next/router";
import { Fragment, useCallback, useState, useMemo } from "react";
import { SwapHistoryComponentSceleton } from "../Sceletons";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import Transaction from "./Transaction";
import FormattedDate from "../Common/FormattedDate";
import useSwaps from "../../hooks/useSwaps";
import HeaderWithMenu from "../HeaderWithMenu";
import { RefreshCcw } from "lucide-react";
import SpinIcon from "../icons/spinIcon";

function SwapHistoryWithExplorer() {
  const router = useRouter();
  const [page, setPage] = useState(1)
  const {loading, swaps, isLastPage} = useSwaps(page);

  const goBack = useCallback(() => {
    window?.['navigation']?.['canGoBack'] ?
      router.back()
      : router.push({
        pathname: "/",
        query: resolvePersistantQueryParams(router.query)
      })
  }, [router])

  const handleLoadMore = useCallback(() => {
    setPage(page + 1)
  }, [page]);

  const memoizedSwapList = useMemo(() => (
    swaps?.map((swapData, index) => (
      <Fragment key={swapData.swap.id}>
        {(index === 0 || swaps[index - 1]?.swap.created_date.substring(0, 10) !== swapData.swap.created_date.substring(0, 10)) && (
          <div className='text-sm text-secondary-text'>
            <FormattedDate date={swapData.swap.created_date} />
          </div>
        )}
        <Transaction swapItem={swapData.swap} />
      </Fragment>
    ))
  ), [swaps]);

  return (
    <div className='bg-secondary-900 sm:shadow-card rounded-lg mb-6 w-full text-primary-text overflow-hidden relative min-h-[620px]'>
      <HeaderWithMenu goBack={goBack} />
      {loading ? (
        <SwapHistoryComponentSceleton />
      ) : (
        <div className="w-full flex flex-col justify-between h-full px-6 mt-3 pb-4 space-y-2 text-secondary-text sm:max-h-[560px] styled-scroll overflow-y-auto">
          {memoizedSwapList}
        </div>
      )}
      <div className="text-primary-text text-sm flex justify-center">
        {
          !isLastPage && !!swaps.length &&
          <button
            disabled={isLastPage || loading}
            type="button"
            onClick={handleLoadMore}
            className="group disabled:text-primary-800 mb-2 text-primary relative flex justify-center py-3 px-4 border-0 font-semibold rounded-md focus:outline-none transform hover:-translate-y-0.5 transition duration-200 ease-in-out"
          >
            <span className="flex items-center mr-2">
              {(!isLastPage && !loading) &&
                <RefreshCcw className="h-5 w-5" />}
              {loading ?
                <SpinIcon className="animate-spin h-5 w-5" />
                : null}
            </span>
            <span>Load more</span>
          </button>
        }
      </div>
      <div id="widget_root" />
    </div>
  );
}

export default SwapHistoryWithExplorer;