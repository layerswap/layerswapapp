import { FC, useMemo, useState } from 'react'
import { ChevronDown, Pencil } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../../shadcn/popover'
import { Wallet } from '@/Models/WalletProvider'
import { Address } from '@/lib/address'
import CheckboxRow from './CheckboxRow'
import { filterChipClasses } from './chipStyles'
import type { ManualDestAddress } from '@/stores/manualDestAddressesStore'

type WalletsDropdownProps = {
    wallets: Wallet[]
    manualAddresses: ManualDestAddress[]
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

const WalletsDropdown: FC<WalletsDropdownProps> = ({ wallets, manualAddresses, selectedAddresses, toggle, count }) => {
    const [open, setOpen] = useState(false)
    const disabled = wallets.length === 0 && manualAddresses.length === 0
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
        for (const m of manualAddresses) {
            const addr = new Address(m.address, null, m.providerName)
            if (seen.has(addr.normalized)) continue
            seen.add(addr.normalized)
            out.push({
                address: m.address,
                label: 'Manually added',
                short: addr.toShortString(),
                icon: <Pencil className="w-4 h-4" />,
            })
        }
        return out
    }, [wallets, manualAddresses])

    return (
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
            </PopoverContent>
        </Popover>
    )
}

export default WalletsDropdown
