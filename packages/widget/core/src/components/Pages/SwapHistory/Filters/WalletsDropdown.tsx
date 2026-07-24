import { FC, useMemo, useState } from 'react'
import { ChevronDown, Settings2 } from 'lucide-react'
import CheckboxRow from './CheckboxRow'
import { filterChipClasses } from './chipStyles'
import { Wallet } from '@/types'
import { Address } from '@/lib/address/Address'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn'
import VaulDrawer from '@/components/Modal/vaulModal'
import WalletsList from '@/components/Wallet/WalletComponents/WalletsList'
import WalletIconView from '@/components/Wallet/WalletIconView'
import { useAddressNameFinder } from '@/stores/addressBookStore'
import { HistoryWalletAddress, MAX_HISTORY_ADDRESSES } from '@/lib/historyWalletAddresses'

type WalletsDropdownProps = {
    wallets: Wallet[]
    addresses: HistoryWalletAddress[]
    selectedAddresses: string[]
    toggle: (address: string) => void
    count: number
}

type Row = {
    address: string
    label: string
    short: string
    icon: React.ReactNode
}

const WalletsDropdown: FC<WalletsDropdownProps> = ({ wallets, addresses, selectedAddresses, toggle, count }) => {
    const [open, setOpen] = useState(false)
    const [manageOpen, setManageOpen] = useState(false)
    const disabled = wallets.length === 0
    const label = count > 0 ? `Wallets (${count})` : 'Wallets'
    const findName = useAddressNameFinder()

    const rows = useMemo<Row[]>(() => addresses.map(({ address, rawAddress, wallet, network }) => {
        const addr = new Address(rawAddress, network, wallet.providerName)
        return {
            address,
            label: findName(rawAddress, network, wallet.providerName) || wallet.displayName || wallet.providerName,
            short: addr.toShortString(),
            icon:  <WalletIconView wallet={wallet} className="w-5 h-5" size={20} />,
        }
    }), [addresses, findName])

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button type="button" disabled={disabled} className={filterChipClasses(count > 0)}>
                        <span>{label}</span>
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-1 w-64 overflow-hidden">
                    <div className="max-h-72 overflow-y-auto styled-scroll">
                        {rows.map(({ address, label, short, icon }) => {
                            const checked = selectedAddresses.includes(address)
                            const isLimitReached = selectedAddresses.length >= MAX_HISTORY_ADDRESSES
                            const isLastRequiredSelection = addresses.length > MAX_HISTORY_ADDRESSES && checked && selectedAddresses.length === 1

                            return (
                                <CheckboxRow
                                    key={address}
                                    checked={checked}
                                    disabled={(!checked && isLimitReached) || isLastRequiredSelection}
                                    onToggle={() => toggle(address)}
                                    icon={icon}
                                    label={label}
                                    sublabel={short}
                                />
                            )
                        })}
                    </div>
                    <p className="px-3 py-2 text-xs text-secondary-text">Select up to {MAX_HISTORY_ADDRESSES} addresses</p>
                    {wallets.length > 0 && rows.length > 0 ? (
                        <div className="mx-3 my-1 h-px bg-secondary-400" />
                    ) : null}
                    {wallets.length > 0 ? (
                        <button
                            type="button"
                            onClick={() => { setOpen(false); setManageOpen(true) }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-2xl text-sm text-primary-text hover:bg-secondary-400"
                        >
                            <Settings2 className="w-4 h-4" />
                            <span>Manage wallets</span>
                        </button>
                    ) : null}
                </PopoverContent>
            </Popover>
            <VaulDrawer
                show={manageOpen}
                setShow={setManageOpen}
                header={`Connected wallets`}
                modalId="connectedWallets"
            >
                <VaulDrawer.Snap id="item-1">
                    <WalletsList wallets={wallets} />
                </VaulDrawer.Snap>
            </VaulDrawer>
        </>
    )
}

export default WalletsDropdown
