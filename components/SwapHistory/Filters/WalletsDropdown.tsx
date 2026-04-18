import { FC, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../../shadcn/popover'
import { Wallet } from '@/Models/WalletProvider'
import { Address } from '@/lib/address'
import CheckboxRow from './CheckboxRow'
import { filterChipClasses } from './chipStyles'

type WalletsDropdownProps = {
    wallets: Wallet[]
    selectedIds: string[]
    toggle: (id: string) => void
    count: number
}

export const walletIdOf = (w: Wallet) => w.internalId ?? w.address

const WalletsDropdown: FC<WalletsDropdownProps> = ({ wallets, selectedIds, toggle, count }) => {
    const [open, setOpen] = useState(false)
    const disabled = wallets.length === 0
    const label = count > 0 ? `Wallets (${count})` : 'Wallets'

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button type="button" disabled={disabled} className={filterChipClasses(count > 0)}>
                    <span>{label}</span>
                    <ChevronDown className="w-4 h-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-1 w-64 max-h-72 overflow-y-auto styled-scroll">
                {wallets.map(w => {
                    const id = walletIdOf(w)
                    const short = new Address(w.address, null, w.providerName).toShortString()
                    return (
                        <CheckboxRow
                            key={id}
                            checked={selectedIds.includes(id)}
                            onToggle={() => toggle(id)}
                            icon={w.icon ? <w.icon className="w-5 h-5" /> : null}
                            label={w.displayName || short}
                            sublabel={w.displayName ? short : undefined}
                        />
                    )
                })}
            </PopoverContent>
        </Popover>
    )
}

export default WalletsDropdown
