import { useIntercom } from "react-use-intercom"
import { useAuthState } from "../context/authContext"
import IconButton from "./buttons/iconButton"
import LayerswapMenu from "./LayerswapMenu"
import GoHomeButton from "./utils/GoHome"
import { ArrowLeft } from 'lucide-react'
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import CoinbaseIcon from "./icons/Wallets/Coinbase"
import MetaMaskIcon from "./icons/Wallets/MetaMask"
import WalletConnectIcon from "./icons/Wallets/WalletConnect"
import RainbowIcon from "./icons/Wallets/Rainbow"
import AddressIcon from "./AddressIcon"
import WalletIcon from "./icons/WalletIcon"
import ChatIcon from "./icons/ChatIcon"

function HeaderWithMenu({ goBack }: { goBack: () => void }) {
   const { email, userId } = useAuthState()
   const { boot, show, update } = useIntercom()
   const updateWithProps = () => update({ email: email, userId: userId })

   return (
      <div className="w-full grid grid-cols-5 px-6 mt-3" >
         {
            goBack &&
            <IconButton onClick={goBack} icon={
               <ArrowLeft strokeWidth="3" />
            }>
            </IconButton>
         }
         <div className='justify-self-center self-center col-start-2 col-span-3 mx-auto overflow-hidden imxMarketplace:hidden md:hidden'>
            <GoHomeButton />
         </div>
         <div className="col-start-5 justify-self-end self-center flex items-center gap-4">
            <ConnectWallet />
            <IconButton className="relative hidden md:inline" onClick={() => {
               boot();
               show();
               updateWithProps()
            }}
               icon={
                  <ChatIcon className="h-6 w-6" strokeWidth="2" />
               }>
            </IconButton>

            <LayerswapMenu />
         </div>
      </div>
   )
}

const ConnectWallet = () => {
   return <ConnectButton.Custom>
      {({ openConnectModal, account, mounted, chain, openAccountModal }) => {
         const connected = !!(mounted && account && chain)
         const { connector } = useAccount()
         return <IconButton onClick={()=> connected ? openAccountModal() : openConnectModal()} icon={
            connected ?
               <div className="font-bold grow flex space-x-2">
                  <div className="inline-flex items-center relative">
                     <AddressIcon address={account.address} size={25} />
                     {
                        connector && <span className="absolute -bottom-1 -right-2 ml-1 shadow-sm text-[10px] leading-4 font-semibold text-white">
                           <ResolveWalletIcon connector={connector?.id} className="w-5 h-5 border-2 border-darkblue-600 rounded-full bg-primary-text" />
                        </span>
                     }
                  </div>
               </div>
               : <WalletIcon className="h-6 w-6" strokeWidth="2" />
         }>
         </IconButton>
      }}
   </ConnectButton.Custom>
}

const ResolveWalletIcon = ({ connector, className }: { connector: string, className: string }) => {
   switch (connector) {
      case KnownKonnectors.MetaMask:
         return <MetaMaskIcon className={className} />
      case KnownKonnectors.Coinbase:
         return <CoinbaseIcon className={className} />
      case KnownKonnectors.WaletConnect:
         return <WalletConnectIcon className={className} />
      case KnownKonnectors.Rainbow:
         return <RainbowIcon className={className} />
      default:
         return <></>
   }
}

const KnownKonnectors = {
   MetaMask: 'metaMask',
   WaletConnect: 'waletConnect',
   Coinbase: 'coinbase',
   Rainbow: 'rainbow'
}

export default HeaderWithMenu