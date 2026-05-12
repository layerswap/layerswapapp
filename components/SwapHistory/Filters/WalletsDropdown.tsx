import { FC, useMemo, useState } from 'react'
import { ChevronDown, Settings2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../../shadcn/popover'
import { Wallet } from '@/Models/WalletProvider'
import { Address } from '@/lib/address'
import CheckboxRow from './CheckboxRow'
import { filterChipClasses } from './chipStyles'
import VaulDrawer from '../../modal/vaulModal'
import WalletsList from '../../Wallet/WalletsList'

type WalletsDropdownProps = {
    wallets: Wallet[]
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

const WalletsDropdown: FC<WalletsDropdownProps> = ({ wallets, selectedAddresses, toggle, count }) => {
    const [open, setOpen] = useState(false)
    const [manageOpen, setManageOpen] = useState(false)
    const disabled = wallets.length === 0
    const label = count > 0 ? `Wallets (${count})` : 'Wallets'

    const rows = useMemo<Row[]>(() => {
        const seen = new Set<string>()
        const out: Row[] = []
        for (const w of wallets) {
            for (const address of w.addresses) {
                const addr = new Address(address, null, w.providerName)
                if (seen.has(addr.normalized)) continue
                seen.add(addr.normalized)
                const Icon = w.icon
                out.push({
                    address,
                    label: w.displayName || w.providerName,
                    short: addr.toShortString(),
                    icon: Icon ? <Icon className="w-5 h-5" /> : null,
                })
            }
        }
        return out
    }, [wallets])

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
                        {rows.map(({ address, label, short, icon }) => (
                            <CheckboxRow
                                key={address}
                                checked={selectedAddresses.includes(address)}
                                onToggle={() => toggle(address)}
                                icon={icon}
                                label={label}
                                sublabel={short}
                            />
                        ))}
                    </div>
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
