import { useIntercom } from "react-use-intercom"
import { useAuthState } from "../../context/authContext"
import IconButton from "../buttons/iconButton"
import GoHomeButton from "../utils/GoHome"
import { ArrowLeft, ArrowRight, BellIcon, ChevronRight, FileStackIcon, LayersIcon, ScrollText } from 'lucide-react'
import ChatIcon from "../icons/ChatIcon"
import dynamic from "next/dynamic"
import LayerswapMenu from "../LayerswapMenu"
import StatusIcon, { YellowIcon } from "../SwapHistory/StatusIcons"
import Modal from "../modal/modal"
import { useCallback, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

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
            <IconButton onClick={goBack} icon={
               <ArrowLeft strokeWidth="2" />
            }>
            </IconButton>
         }

         {
            router.pathname == "/" &&
            <AnimatePresence exitBeforeEnter>
               <PendingSwapsPopover />
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
import useSWR from "swr"
import LayerSwapApiClient, { SwapItem, SwapStatusInNumbers, TransactionType } from "../../lib/layerSwapApiClient"
import { ApiResponse } from "../../Models/ApiResponse"
import { useSettingsState } from "../../context/settings"
import Image from 'next/image';
import { useRouter } from "next/router"
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover"
import { classNames } from "../utils/classNames"
import { truncateDecimals } from "../utils/RoundDecimals"
import { SwapDataProvider } from "../../context/swap"
import SwapDetails from "../Swap"

const PendingSwapsPopover = () => {
   const [open, setOpen] = useState(false);
   const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
   const [selectedSwap, setSelectedSwap] = useState<SwapItem | undefined>()

   const apiClient = new LayerSwapApiClient()
   const { data, mutate } =
      useSWR<ApiResponse<SwapItem[]>>(
         `/swaps?status=${SwapStatusInNumbers.Pending}&version=${LayerSwapApiClient.apiVersion}`,
         apiClient.fetcher
      )
   const pendingSwapsCount = Number(data?.data?.length)
   const settings = useSettingsState()
   const { exchanges, networks, currencies, resolveImgSrc } = settings

   const handleSWapDetailsShow = useCallback((show: boolean) => {
      setOpenSwapDetailsModal(show)
      if (!show)
         mutate()
   }, [])
   const handleopenSwapDetails = (swap: SwapItem) => {
      setOpen(false)
      setSelectedSwap(swap)
      setOpenSwapDetailsModal(true)
   }


   return <span className="text-secondary-text cursor-pointer relative">
      {
         <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={` disabled:opacity-50 disabled:cursor-not-allowed `}>

               {pendingSwapsCount > 0 && <motion.div
                  className="relative top-"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.4 }}
               >
                  <IconButton icon={
                     <div className="relative">
                        <ScrollText strokeWidth="2" />
                        <div className="text-xs text-[#2F4858] font-bold text-center absolute -top-3 -right-3 bg-[#facc15] rounded-full h-4 w-4">
                           {pendingSwapsCount}
                        </div>
                     </div>
                  }>
                  </IconButton>
               </motion.div>}
            </PopoverTrigger>
            <PopoverContent align="start" className='flex flex-col items-start gap-2 w-fit'>
               <div className="text-sm py-2 font-medium focus:outline-none h-full">
                  <div className="max-h-[450px] styled-scroll overflow-y-auto ">
                     <table className="w-full divide-y divide-secondary-500">
                        <thead className="text-secondary-text">
                        </thead>
                        <tbody>
                           {
                              data?.data?.map((swap, index) => {
                                 const { source_exchange: source_exchange_internal_name,
                                    destination_network: destination_network_internal_name,
                                    source_network: source_network_internal_name,
                                    destination_exchange: destination_exchange_internal_name,
                                    source_network_asset
                                 } = swap

                                 const source = source_exchange_internal_name ? exchanges.find(e => e.internal_name === source_exchange_internal_name) : networks.find(e => e.internal_name === source_network_internal_name)
                                 const destination_exchange = destination_exchange_internal_name && exchanges.find(e => e.internal_name === destination_exchange_internal_name)
                                 const destination = destination_exchange_internal_name ? destination_exchange : networks.find(n => n.internal_name === destination_network_internal_name)
                                 const output_transaction = swap.transactions.find(t => t.type === TransactionType.Output)
                                 const source_currency = currencies?.find(c => c.asset === source_network_asset)

                                 return <tr className="hover:bg-secondary-500" onClick={() => handleopenSwapDetails(swap)} key={swap.id}>
                                    <td
                                       className={classNames(
                                          index === 0 ? '' : 'border-t border-secondary-500',
                                          'relative text-sm text-primary-text table-cell px-2'
                                       )}
                                    >
                                       <div className="text-primary-text flex items-center">
                                          <div className="flex-shrink-0 h-5 w-5 relative">
                                             {source &&
                                                <Image
                                                   src={resolveImgSrc(source)}
                                                   alt="From Logo"
                                                   height="60"
                                                   width="60"
                                                   className="rounded-md object-contain"
                                                />
                                             }
                                          </div>
                                          <ArrowRight className="h-4 w-4 mx-2" />
                                          <div className="flex-shrink-0 h-5 w-5 relative block">
                                             {destination &&
                                                <Image
                                                   src={resolveImgSrc(destination)}
                                                   alt="To Logo"
                                                   height="60"
                                                   width="60"
                                                   className="rounded-md object-contain"
                                                />
                                             }
                                          </div>
                                       </div>
                                       {index !== 0 ? <div className="absolute right-0 left-6 -top-px h-px bg-secondary-500" /> : null}
                                    </td>
                                    <td className={classNames(
                                       index === 0 ? '' : 'border-t border-secondary-500',
                                       'relative text-sm table-cell px-2'
                                    )}>
                                       <span className="flex items-center">
                                          {swap && <StatusIcon swap={swap} short={true}/>}
                                       </span>
                                    </td>
                                    <td
                                       className={classNames(
                                          index === 0 ? '' : 'border-t border-secondary-500',
                                          'px-3 py-3.5 text-sm text-primary-text table-cell'
                                       )}
                                    >
                                       <div className="flex justify-between items-center cursor-pointer" onClick={(e) => { handleopenSwapDetails(swap); e.preventDefault() }}>
                                          <div className="">
                                             {
                                                swap?.status == 'completed' ?
                                                   <span className="ml-1 md:ml-0">
                                                      {output_transaction ? truncateDecimals(output_transaction?.amount, source_currency?.precision) : '-'}
                                                   </span>
                                                   :
                                                   <span>
                                                      {truncateDecimals(swap.requested_amount, source_currency?.precision)}
                                                   </span>
                                             }
                                             <span className="ml-1">{swap.destination_network_asset}</span>
                                          </div>
                                          <ChevronRight className="h-5 w-5" />
                                       </div>
                                    </td>
                                 </tr>
                              })
                           }
                        </tbody>
                     </table>
                  </div>
               </div>
            </PopoverContent>
         </Popover>
      }
      <Modal height='90%' show={openSwapDetailsModal} setShow={handleSWapDetailsShow} header={`Complete the swap`}>
         <SwapDataProvider id={selectedSwap?.id}>
            <SwapDetails type="contained" />
         </SwapDataProvider>
      </Modal>
   </span >


}

const PendingSwapsModal = () => {
   const [openTopModal, setOpenTopModal] = useState(false);
   const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
   const [selectedSwap, setSelectedSwap] = useState<SwapItem | undefined>()
   const settings = useSettingsState()
   const { exchanges, networks, resolveImgSrc, currencies } = settings

   const handleopenSwapDetails = (swap: SwapItem) => {
      setSelectedSwap(swap)
      setOpenSwapDetailsModal(true)
   }

   const apiClient = new LayerSwapApiClient()
   const { data, mutate } =
      useSWR<ApiResponse<SwapItem[]>>(
         `/swaps?status=${SwapStatusInNumbers.Pending}&version=${LayerSwapApiClient.apiVersion}`,
         apiClient.fetcher,
         { refreshInterval: 7000 }
      )
   const pendingSwapsCount = Number(data?.data?.length)

   const handleSWapDetailsShow = useCallback((show: boolean) => {
      setOpenSwapDetailsModal(show)
      if (!show)
         mutate()
   }, [])
   return <span className="text-secondary-text cursor-pointer relative">
      {
         <>
            {pendingSwapsCount > 0 && !openTopModal && <motion.div
               className="relative top-"
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: -20, opacity: 0 }}
               transition={{ duration: 0.4 }}
            >
               <IconButton onClick={() => setOpenTopModal(true)} icon={
                  <div className="relative">
                     <BellIcon strokeWidth="2" />
                     <div className="text-xs text-[#2F4858] font-bold text-center absolute -top-3 -right-3 bg-[#facc15] rounded-full h-4 w-4">
                        {pendingSwapsCount}
                     </div>
                  </div>
               }>
               </IconButton>
            </motion.div>}
            <Modal height="80%" show={openTopModal} setShow={setOpenTopModal} header={<h2 className="font-normal leading-none tracking-tight">Pending swaps</h2>}>
               <div className="text-sm py-5 font-medium focus:outline-none h-full">
                  <div className="max-h-[450px] styled-scroll overflow-y-auto ">
                     <table className="w-full divide-y divide-secondary-500">
                        <thead className="text-secondary-text">
                           <tr>
                              <th scope="col" className="text-left text-sm font-semibold">
                                 <div className="block">
                                    Swap details
                                 </div>
                              </th>
                              <th
                                 scope="col"
                                 className="px-3 py-3.5 text-left text-sm font-semibold  "
                              >
                                 Status
                              </th>
                              <th
                                 scope="col"
                                 className="px-3 py-3.5 text-left text-sm font-semibold  "
                              >
                                 Amount
                              </th>
                           </tr>
                        </thead>
                        <tbody>
                           {
                              data?.data?.map((swap, index) => {
                                 const { source_exchange: source_exchange_internal_name,
                                    destination_network: destination_network_internal_name,
                                    source_network: source_network_internal_name,
                                    destination_exchange: destination_exchange_internal_name,
                                    source_network_asset
                                 } = swap

                                 const source = source_exchange_internal_name ? exchanges.find(e => e.internal_name === source_exchange_internal_name) : networks.find(e => e.internal_name === source_network_internal_name)
                                 const destination_exchange = destination_exchange_internal_name && exchanges.find(e => e.internal_name === destination_exchange_internal_name)
                                 const destination = destination_exchange_internal_name ? destination_exchange : networks.find(n => n.internal_name === destination_network_internal_name)
                                 const output_transaction = swap.transactions.find(t => t.type === TransactionType.Output)
                                 const source_currency = currencies?.find(c => c.asset === source_network_asset)

                                 return <tr onClick={() => handleopenSwapDetails(swap)} key={swap.id}>

                                    <td
                                       className={classNames(
                                          index === 0 ? '' : 'border-t border-secondary-500',
                                          'relative text-sm text-primary-text table-cell'
                                       )}
                                    >
                                       <div className="text-primary-text flex items-center">
                                          <div className="flex-shrink-0 h-5 w-5 relative">
                                             {source &&
                                                <Image
                                                   src={resolveImgSrc(source)}
                                                   alt="From Logo"
                                                   height="60"
                                                   width="60"
                                                   className="rounded-md object-contain"
                                                />
                                             }
                                          </div>
                                          <ArrowRight className="h-4 w-4 mx-2" />
                                          <div className="flex-shrink-0 h-5 w-5 relative block">
                                             {destination &&
                                                <Image
                                                   src={resolveImgSrc(destination)}
                                                   alt="To Logo"
                                                   height="60"
                                                   width="60"
                                                   className="rounded-md object-contain"
                                                />
                                             }
                                          </div>
                                       </div>
                                       {index !== 0 ? <div className="absolute right-0 left-6 -top-px h-px bg-secondary-500" /> : null}

                                    </td>
                                    <td className={classNames(
                                       index === 0 ? '' : 'border-t border-secondary-500',
                                       'relative text-sm table-cell'
                                    )}>
                                       <span className="flex items-center">
                                          {swap && <StatusIcon swap={swap} />}
                                       </span>
                                    </td>
                                    <td
                                       className={classNames(
                                          index === 0 ? '' : 'border-t border-secondary-500',
                                          'px-3 py-3.5 text-sm text-primary-text table-cell'
                                       )}
                                    >
                                       <div className="flex justify-between items-center cursor-pointer" onClick={(e) => { handleopenSwapDetails(swap); e.preventDefault() }}>
                                          <div className="">
                                             {
                                                swap?.status == 'completed' ?
                                                   <span className="ml-1 md:ml-0">
                                                      {output_transaction ? truncateDecimals(output_transaction?.amount, source_currency?.precision) : '-'}
                                                   </span>
                                                   :
                                                   <span>
                                                      {truncateDecimals(swap.requested_amount, source_currency?.precision)}
                                                   </span>
                                             }
                                             <span className="ml-1">{swap.destination_network_asset}</span>
                                          </div>
                                          <ChevronRight className="h-5 w-5" />
                                       </div>
                                    </td>
                                 </tr>
                              })
                           }
                        </tbody>
                     </table>
                  </div>
               </div>
            </Modal>
            <Modal height='90%' show={openSwapDetailsModal} setShow={handleSWapDetailsShow} header={`Complete the swap`}>
               <SwapDataProvider id={selectedSwap?.id}>
                  <SwapDetails type="contained" />
               </SwapDataProvider>
            </Modal>
         </>
      }
   </span >
}


export default HeaderWithMenu