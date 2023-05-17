import { ConnectButton } from "@rainbow-me/rainbowkit"
import { StarknetWindowObject, getStarknet } from "get-starknet-core"
import { Check, Copy, LogOut, WalletIcon } from "lucide-react"
import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import AddressIcon from "../AddressIcon"
import IconButton from "../buttons/iconButton"
import CoinbaseIcon from "../icons/Wallets/Coinbase"
import MetaMaskIcon from "../icons/Wallets/MetaMask"
import RainbowIcon from "../icons/Wallets/Rainbow"
import WalletConnectIcon from "../icons/Wallets/WalletConnect"
import { connect, disconnect } from "get-starknet"
import { Dialog, DialogTrigger, DialogContent } from "../shadcn/dialog"
import shortenAddress from "../utils/ShortenAddress"
import useCopyClipboard from "../../hooks/useCopyClipboard"
import Image from "next/image"
import { Contract, uint256 } from "starknet"
import Erc20Abi from "../../lib/abis/ERC20.json"
import { BigNumber, utils } from "ethers"
import { truncateDecimals } from "../utils/RoundDecimals"

export const StarknetWallet = () => {

    const [account, setAccount] = useState<StarknetWindowObject>()
    const [isCopied, setCopied] = useCopyClipboard()
    const [balance, setBalance] = useState(0)
    const starknet = getStarknet()
    const walletAddress = account?.selectedAddress

    useEffect(() => {
        (async () => {
            const lastConnectedWallet = await starknet.getLastConnectedWallet()

            if (lastConnectedWallet) {
                const res = await connect()
                setAccount(res)
                const erc20Contract = new Contract(
                    Erc20Abi,
                    "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
                    res?.account,
                )
                const balanceResult = await erc20Contract.balanceOf(res?.account?.address)
                const balanceInWei = BigNumber.from(uint256.uint256ToBN(balanceResult.balance as any).toString()).toString();
                const formattedResult = utils.formatUnits(balanceInWei, 18);
                setBalance(Number(formattedResult))
            }
        })()
    }, [])

    const handleDisconnect = () => {
        setAccount(null);
        disconnect({ clearLastWallet: true })
    }

    return walletAddress ?
        <Dialog>
            <DialogTrigger>
                <div className="font-bold grow flex space-x-2 -mx-2 py-1.5 px-2 justify-self-start text-primary-text hover:bg-darkblue-500 hover:text-white focus:outline-none rounded-lg items-center">
                    <div className="inline-flex items-center relative">
                        <AddressIcon address={walletAddress} size={25} />
                        {
                            <span className="absolute -bottom-1 -right-2 ml-1 shadow-sm text-[10px] leading-4 font-semibold text-white">
                                <Image width={20} height={20} src={account.icon} className="border-2 border-darkblue-600 rounded-full bg-primary-text" alt={account.id} />
                            </span>
                        }
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent>
                <div className="flex flex-col items-center text-white gap-3">
                    <div className="inline-flex items-center relative mt-3">
                        <AddressIcon address={walletAddress} size={70} />
                        {
                            <span className="absolute -bottom-1 -right-2 ml-1 shadow-sm text-[10px] leading-4 font-semibold text-white">
                                <Image width={30} height={30} src={account.icon} className=" border-2 border-darkblue-600 rounded-full bg-primary-text" alt={account.id} />
                            </span>
                        }
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold">{shortenAddress(walletAddress)}</p>
                        <p className="text-base font-medium text-primary-text">{truncateDecimals(balance, 6)} ETH</p>
                    </div>
                    <div className="grid grid-cols-2 w-full gap-2 text-xs font-medium">
                        <button onClick={() => setCopied(walletAddress)} type="button" className="w-full py-2 flex flex-col items-center text-white bg-darkblue-500 rounded-md gap-1 transition duration-100 hover:scale-[1.03] hover:brightness-110 active:scale-95">
                            {
                                isCopied ?
                                    <Check className="h-4 w-4" />
                                    :
                                    <Copy className="h-4 w-4" />
                            }
                            <span>Copy Address</span>
                        </button>
                        <button onClick={handleDisconnect} type="button" className="w-full py-2 flex flex-col items-center text-white bg-darkblue-500 rounded-md gap-1 transition duration-100 hover:scale-[1.03] hover:brightness-110 active:scale-95">
                            <LogOut className="h-4 w-4" />
                            <span>Disconnect</span>
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
        : <></>
}

export const RainbowKitConnectWallet = () => {
    return <ConnectButton.Custom>
        {({ openConnectModal, account, mounted, chain, openAccountModal }) => {
            const connected = !!(mounted && account && chain)
            const { connector } = useAccount()
            return <IconButton onClick={() => connected ? openAccountModal() : openConnectModal()} icon={
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
    Rainbow: 'rainbow',
}
