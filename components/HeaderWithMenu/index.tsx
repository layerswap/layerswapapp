import { useIntercom } from "react-use-intercom"
import { useAuthState } from "../../context/authContext"
import IconButton from "../buttons/iconButton"
import GoHomeButton from "../utils/GoHome"
import { ArrowLeft, ScrollText } from 'lucide-react'
import ChatIcon from "../icons/ChatIcon"
import dynamic from "next/dynamic"
import LayerswapMenu from "../LayerswapMenu"
import Modal from "../modal/modal"
import { useCallback, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import useSWR from "swr"
import LayerSwapApiClient, { SwapItem, SwapStatusInNumbers } from "../../lib/layerSwapApiClient"
import { ApiResponse } from "../../Models/ApiResponse"
import { useRouter } from "next/router"
import { SwapDataProvider } from "../../context/swap"
import SwapsListModal from "../SwapHistory/Modal"

const WalletsHeader = dynamic(() => import("../ConnectedWallets").then((comp) => comp.WalletsHeader), {
   loading: () => <></>
})

function HeaderWithMenu({ goBack }: { goBack: (() => void) | undefined | null }) {
   const { email, userId } = useAuthState()
   const { boot, show, update } = useIntercom()
   const updateWithProps = () => update({ email: email, userId: userId })
   const router = useRouter()

   return (
      <div className="w-full grid grid-cols-5 px-6 mt-3" >
         {
            goBack &&
            <IconButton onClick={goBack}
               aria-label="Go back"
               icon={
                  <ArrowLeft strokeWidth="2" />
               }>
            </IconButton>
         }

         {
            router.pathname == "/" &&
            <AnimatePresence >
               <PendingSwapsModal />
            </AnimatePresence>
         }

         <div className='justify-self-center self-center col-start-2 col-span-3 mx-auto overflow-hidden md:hidden'>
            <GoHomeButton />
         </div>

         <div className="space-x-0 col-start-5 justify-self-end self-center flex items-center gap-x-2">
            <WalletsHeader />
            <IconButton className="relative hidden md:inline" onClick={() => {
               boot();
               show();
               updateWithProps()
            }}
               icon={
                  <ChatIcon className="h-6 w-6" strokeWidth="2" />
               }>
            </IconButton>
            <div className="fixed-width-container">
               <LayerswapMenu />
            </div>
         </div>
      </div>
   )
}

const PendingSwapsModal = () => {
   const apiClient = new LayerSwapApiClient()
   const { data, mutate } =
      useSWR<ApiResponse<{ count: number }>>(
         `/swaps/count?version=${LayerSwapApiClient.apiVersion}`,
         apiClient.fetcher)

   const pendingSwapsCount = Number(data?.data?.count)

   return <span className="text-secondary-text cursor-pointer relative">
      {
         <>

            {pendingSwapsCount > 0 && <motion.div
               className="relative top-"
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: -20, opacity: 0 }}
               transition={{ duration: 0.4 }}
            >
               <SwapsListModal loadExplorerSwaps={false} title="Pending swaps" statuses={SwapStatusInNumbers.Pending} >
                  <IconButton icon={
                     <div className="relative">
                        <ScrollText strokeWidth="2" />
                        <div className="text-xs text-[#2F4858] font-bold text-center absolute -top-3 -right-3 bg-[#facc15] rounded-full h-4 w-4">
                           {pendingSwapsCount}
                        </div>
                     </div>
                  }>
                  </IconButton>
               </SwapsListModal>
            </motion.div>}
         </>
      }
   </span >
}


export default HeaderWithMenu