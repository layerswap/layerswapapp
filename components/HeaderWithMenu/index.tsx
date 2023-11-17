import { useIntercom } from "react-use-intercom"
import { useAuthState } from "../../context/authContext"
import IconButton from "../buttons/iconButton"
import GoHomeButton from "../utils/GoHome"
import { ArrowLeft, ArrowRight, BellIcon, ChevronRight, ChevronRightIcon, FileStackIcon, Fuel, LayersIcon, ScrollText } from 'lucide-react'
import ChatIcon from "../icons/ChatIcon"
import dynamic from "next/dynamic"
import LayerswapMenu from "../LayerswapMenu"
import StatusIcon, { YellowIcon } from "../SwapHistory/StatusIcons"
import Modal from "../modal/modal"
import { FC, useCallback, useMemo, useState } from "react"
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
import useSWR from "swr"
import LayerSwapApiClient, { SwapItem, SwapStatusInNumbers, TransactionType } from "../../lib/layerSwapApiClient"
import { ApiResponse } from "../../Models/ApiResponse"
import { useSettingsState } from "../../context/settings"
import Image from 'next/image';
import { useRouter } from "next/router"
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover"
import { truncateDecimals } from "../utils/RoundDecimals"
import { SwapDataProvider, useSwapDataState } from "../../context/swap"
import SwapDetails from "../Swap"
import { CalculateMinAllowedAmount, CalculateReceiveAmount } from "../../lib/fees"
import { GetDefaultNetwork } from "../../helpers/settingsHelper"
import { useQueryState } from "../../context/query"
import { Currency } from "../../Models/Currency"
import { Layer } from "../../Models/Layer"
import useWallet from "../../hooks/useWallet"
import { Partner } from "../../Models/Partner"
import shortenAddress, { shortenEmail } from "../utils/ShortenAddress"
import KnownInternalNames from "../../lib/knownIds"

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
   const { exchanges, networks, currencies, layers } = settings

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
               <div className="max-h-[450px] styled-scroll overflow-y-auto text-sm p space-y-4 font-medium focus:outline-none h-full">
                  {
                     data?.data?.map((swap, index) => {
                        const { source_exchange: source_exchange_internal_name,
                           destination_network: destination_network_internal_name,
                           source_network: source_network_internal_name,
                           destination_exchange: destination_exchange_internal_name,
                           source_network_asset
                        } = swap
                        const source_internal_name = source_exchange_internal_name || source_network_internal_name
                        const destination_internal_name = destination_exchange_internal_name || destination_network_internal_name

                        const source = layers.find(l => l.internal_name === source_internal_name)
                        const destination = layers.find(l => l.internal_name === destination_internal_name)
                        const output_transaction = swap.transactions.find(t => t.type === TransactionType.Output)
                        const currency = currencies?.find(c => c.asset === source_network_asset)
                        let min_amount =
                           CalculateMinAllowedAmount({
                              from: source,
                              to: destination,
                              currency,
                              refuel: swap.has_refuel
                           }, networks, currencies);

                        if (!swap || !source || !currency || !destination) {
                           return <></>
                        }
                        const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)
                        const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)
                        const swapRefuelTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refuel)

                        const requested_amount = (swapInputTransaction?.amount ??
                           (Number(min_amount) > Number(swap.requested_amount) ? min_amount : swap.requested_amount)) || undefined

                        const receive_amount =
                           swapOutputTransaction?.amount
                           || CalculateReceiveAmount({
                              from: source,
                              to: destination,
                              currency,
                              amount: requested_amount?.toString(),
                              refuel: swap.has_refuel
                           }, networks, currencies)
                        const destinationNetworkNativeAsset = currencies?.find(c => c.asset == networks.find(n => n.internal_name === destination?.internal_name)?.native_currency);
                        const destinationNetwork = GetDefaultNetwork(destination, currency?.asset)
                        const native_usd_price = Number(destinationNetworkNativeAsset?.usd_price)

                        const refuel_amount_in_usd = Number(destinationNetwork?.refuel_amount_in_usd)

                        const refuelAmountInNativeCurrency = swap?.has_refuel
                           ? ((swapRefuelTransaction?.amount ??
                              (refuel_amount_in_usd / native_usd_price))) : undefined;

                        return <div
                           className="bg-secondary-700 cursor-pointer rounded-lg px-3 py-4 border border-secondary-500 w-full relative z-10 space-y-4"
                           onClick={() => handleopenSwapDetails(swap)}
                           key={swap.id}>
                           {
                              <Summary
                                 currency={currency}
                                 source={source}
                                 destination={destination}
                                 requestedAmount={requested_amount as number}
                                 receiveAmount={receive_amount}
                                 destinationAddress={swap.destination_address}
                                 hasRefuel={swap?.has_refuel}
                                 refuelAmount={refuelAmountInNativeCurrency}
                                 fee={5}
                                 swap={swap}
                                 exchange_account_connected={swap?.exchange_account_connected}
                                 exchange_account_name={swap?.exchange_account_name}
                              />
                           }
                        </div>
                     })
                  }
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
   const { exchanges, networks, currencies, layers } = settings

   const handleopenSwapDetails = (swap: SwapItem) => {
      setSelectedSwap(swap)
      setOpenSwapDetailsModal(true)
   }

   const apiClient = new LayerSwapApiClient()
   const { data, mutate } =
      useSWR<ApiResponse<SwapItem[]>>(
         `/swaps?status=${SwapStatusInNumbers.Pending}&version=${LayerSwapApiClient.apiVersion}`,
         apiClient.fetcher
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
                     <ScrollText strokeWidth="2" />
                     <div className="text-xs text-[#2F4858] font-bold text-center absolute -top-3 -right-3 bg-[#facc15] rounded-full h-4 w-4">
                        {pendingSwapsCount}
                     </div>
                  </div>
               }>
               </IconButton>
            </motion.div>}
            <Modal height="80%" show={openTopModal} setShow={setOpenTopModal} header={<h2 className="font-normal leading-none tracking-tight">Pending swaps</h2>}>
               <div className="text-sm py-5 space-y-4 font-medium focus:outline-none h-full">
                  {
                     data?.data?.map((swap, index) => {
                        const { source_exchange: source_exchange_internal_name,
                           destination_network: destination_network_internal_name,
                           source_network: source_network_internal_name,
                           destination_exchange: destination_exchange_internal_name,
                           source_network_asset
                        } = swap
                        const source_internal_name = source_exchange_internal_name || source_network_internal_name
                        const destination_internal_name = destination_exchange_internal_name || destination_network_internal_name

                        const source = layers.find(l => l.internal_name === source_internal_name)
                        const destination = layers.find(l => l.internal_name === destination_internal_name)
                        const output_transaction = swap.transactions.find(t => t.type === TransactionType.Output)
                        const currency = currencies?.find(c => c.asset === source_network_asset)
                        let min_amount =
                           CalculateMinAllowedAmount({
                              from: source,
                              to: destination,
                              currency,
                              refuel: swap.has_refuel
                           }, networks, currencies);

                        if (!swap || !source || !currency || !destination) {
                           return <></>
                        }
                        const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)
                        const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)
                        const swapRefuelTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refuel)

                        const requested_amount = (swapInputTransaction?.amount ??
                           (Number(min_amount) > Number(swap.requested_amount) ? min_amount : swap.requested_amount)) || undefined

                        const receive_amount =
                           swapOutputTransaction?.amount
                           || CalculateReceiveAmount({
                              from: source,
                              to: destination,
                              currency,
                              amount: requested_amount?.toString(),
                              refuel: swap.has_refuel
                           }, networks, currencies)
                        const destinationNetworkNativeAsset = currencies?.find(c => c.asset == networks.find(n => n.internal_name === destination?.internal_name)?.native_currency);
                        const destinationNetwork = GetDefaultNetwork(destination, currency?.asset)
                        const native_usd_price = Number(destinationNetworkNativeAsset?.usd_price)

                        const refuel_amount_in_usd = Number(destinationNetwork?.refuel_amount_in_usd)

                        const refuelAmountInNativeCurrency = swap?.has_refuel
                           ? ((swapRefuelTransaction?.amount ??
                              (refuel_amount_in_usd / native_usd_price))) : undefined;

                        return <div
                           onClick={() => handleopenSwapDetails(swap)}
                           key={swap.id}>
                           {
                              <Summary
                                 currency={currency}
                                 source={source}
                                 destination={destination}
                                 requestedAmount={requested_amount as number}
                                 receiveAmount={receive_amount}
                                 destinationAddress={swap.destination_address}
                                 hasRefuel={swap?.has_refuel}
                                 refuelAmount={refuelAmountInNativeCurrency}
                                 fee={5}
                                 swap={swap}
                                 exchange_account_connected={swap?.exchange_account_connected}
                                 exchange_account_name={swap?.exchange_account_name}
                              />
                           }
                        </div>
                     })
                  }
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

type SwapInfoProps = {
   currency: Currency,
   source: Layer,
   destination: Layer;
   requestedAmount: number;
   receiveAmount?: number;
   destinationAddress: string;
   hasRefuel?: boolean;
   refuelAmount?: number;
   fee?: number,
   exchange_account_connected: boolean;
   exchange_account_name?: string;
   swap: SwapItem
}
const Summary: FC<SwapInfoProps> = ({ swap, currency, source: from, destination: to, requestedAmount, receiveAmount, destinationAddress, hasRefuel, refuelAmount, fee, exchange_account_connected, exchange_account_name }) => {
   const { resolveImgSrc, currencies, networks } = useSettingsState()
   const { getWithdrawalProvider: getProvider } = useWallet()
   const provider = useMemo(() => {
      return from && getProvider(from)
   }, [from, getProvider])

   const wallet = provider?.getConnectedWallet()

   const { selectedAssetNetwork } = useSwapDataState()

   const {
      hideFrom,
      hideTo,
      account,
      appName,
      hideAddress
   } = useQueryState()

   const layerswapApiClient = new LayerSwapApiClient()
   const { data: partnerData } = useSWR<ApiResponse<Partner>>(appName && `/apps?name=${appName}`, layerswapApiClient.fetcher)
   const partner = partnerData?.data

   const source = hideFrom ? partner : from
   const destination = hideTo ? partner : to

   const requestedAmountInUsd = (currency?.usd_price * requestedAmount).toFixed(2)
   const receiveAmountInUsd = receiveAmount ? (currency?.usd_price * receiveAmount).toFixed(2) : undefined
   const nativeCurrency = refuelAmount && to?.isExchange === false ?
      currencies.find(c => c.asset === to?.native_currency) : null

   const truncatedRefuelAmount = (hasRefuel && refuelAmount) ?
      truncateDecimals(refuelAmount, nativeCurrency?.precision) : null
   const refuelAmountInUsd = ((nativeCurrency?.usd_price || 1) * (truncatedRefuelAmount || 0)).toFixed(2)

   let sourceAccountAddress = ""
   if (hideFrom && account) {
      sourceAccountAddress = shortenAddress(account);
   }
   else if (wallet && !from?.isExchange) {
      sourceAccountAddress = shortenAddress(wallet.address);
   }
   else if (from?.internal_name === KnownInternalNames.Exchanges.Coinbase && exchange_account_connected) {
      sourceAccountAddress = shortenEmail(exchange_account_name, 10);
   }
   else if (from?.isExchange) {
      sourceAccountAddress = "Exchange"
   }
   else {
      sourceAccountAddress = "Network"
   }

   const destAddress = (hideAddress && hideTo && account) ? account : destinationAddress
   const sourceCurrencyName = selectedAssetNetwork?.network?.currencies.find(c => c.asset === currency.asset)?.name || currency?.asset
   const destCurrencyName = networks?.find(n => n.internal_name === to?.internal_name)?.currencies?.find(c => c?.asset === currency?.asset)?.name || currency?.asset
   const creadtedDate = new Date(swap.created_date).toDateString()
   const creadtedTime = new Date(swap.created_date).toLocaleTimeString()

   return (
      <div className="bg-secondary-800 rounded-lg cursor-pointer border border-secondary-500">
         <div className="bg-secondary-700 rounded-lg px-3 py-4 border border-secondary-500 w-full relative z-10 space-y-4">
            <div className="font-normal flex flex-col w-full relative z-10 space-y-4">
               <div className="grid grid-cols-11 items-center w-full">
                  <div className="flex col-span-5 items-center gap-3 grow">
                     {
                        source &&
                        <Image
                           src={resolveImgSrc(source)}
                           alt={source.display_name}
                           width={32}
                           height={32}
                           className="rounded-full" />
                     }
                     <div>
                        <p className="text-primary-text text-sm leading-5">
                           {source?.display_name}
                        </p>
                        <p className="text-secondary-text text-sm">{truncateDecimals(requestedAmount, currency.precision)} {sourceCurrencyName}</p>
                     </div>
                  </div>
                  <div><ChevronRightIcon className="text-secondary-text/30"/></div>
                  <div className="flex col-span-5 items-center gap-3 grow">
                     {destination && <Image src={resolveImgSrc(destination)} alt={destination.display_name} width={32} height={32} className="rounded-full" />}
                     <div>
                        <p className="text-primary-text text-sm leading-5">{destination?.display_name}</p>
                        <p className="text-sm text-secondary-text">{shortenAddress(destAddress as string)}</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
         <div className="px-3 py-2">
            <span className="grow w-full grid grid-cols-11 items-center text-sm font-normal">
               <span className="col-span-5 text-secondary-text/60">{creadtedDate}</span>
               <span className="col-start-7 col-span-5 opacity-60 text-secondary-text">{<StatusIcon swap={swap} />}</span>
            </span>
         </div>
      </div>
   )
}



export default HeaderWithMenu