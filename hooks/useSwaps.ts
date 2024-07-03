import { useEffect, useMemo, useState, useRef } from "react";
import toast from "react-hot-toast";
import useWallet from "./useWallet";
import LayerSwapApiClient, { SwapResponse } from "../lib/layerSwapApiClient";
import { UserType, useAuthState } from "../context/authContext";

const PAGE_SIZE = 10;

export default function useSwaps(page: number) {
    const [explorerSwaps, setExplorerSwaps] = useState<SwapResponse[]>([])
  const [allSwaps, setAllSwaps] = useState<SwapResponse[]>([])
  const [loadingExplorer, setLoadingExplorer] = useState(false)
  const [loadingAllSwaps, setLoadingAllSwaps] = useState(false)
  const [isLastPage, setIsLastPage] = useState(false)
  const { wallets } = useWallet()
  const { userType } = useAuthState()
  
  const explorerEffectRuning = useRef(false)
  const allSwapsEffectRunnig = useRef(false)

  useEffect(() => {
    if (!userType || userType != UserType.AuthenticatedUser || !wallets?.length || explorerEffectRuning.current) return
    
    explorerEffectRuning.current = true;
    
    (async () => {
      setLoadingExplorer(true)
      const layerswapApiClient = new LayerSwapApiClient()
      try {
        const promises = wallets.map(wallet =>
          layerswapApiClient.GetExplorerSwapsByAddressAsync(wallet.address)
        )

        const results = await Promise.all(promises)
        const combinedExplorerSwaps = results.flatMap(result => result.data!)
        setExplorerSwaps(combinedExplorerSwaps)
      } catch (error) {
        toast.error(error.message)
      } finally {
        setLoadingExplorer(false)
        explorerEffectRuning.current = false
      }
    })();
  }, [wallets.length, userType])

  useEffect(() => {
    if (!userType || userType != UserType.AuthenticatedUser || allSwapsEffectRunnig.current) return
    
    allSwapsEffectRunnig.current = true;
    
    (async () => {
      setLoadingAllSwaps(true)
      const layerswapApiClient = new LayerSwapApiClient()
      try {
        const result = await layerswapApiClient.GetSwapsAsync(page, true)
        setAllSwaps(prevSwaps => ([...prevSwaps, ...result.data!]))

        if (result.data!.length < PAGE_SIZE) {
          setIsLastPage(true)
        }
      } catch (error) {
        toast.error(error.message)
      } finally {
        setLoadingAllSwaps(false)
        allSwapsEffectRunnig.current = false
      }
    })();
  }, [page, userType])

  const mergedSwaps = useMemo(() => {
    return [...explorerSwaps, ...allSwaps].sort(
      (a, b) => new Date(b.swap.created_date).getTime() - new Date(a.swap.created_date).getTime()
    );
  }, [explorerSwaps, allSwaps])

  const loading = loadingExplorer || loadingAllSwaps

  return { swaps: mergedSwaps, loading, isLastPage }
}