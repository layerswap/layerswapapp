import { useMemo, useState } from 'react'
import { NetworkType } from '@/Models/Network'
import { useSettingsState } from '@/context/settings'
import { classifyAddress, AddressTypeLabel, AddressSelectionMode, defaultNetworkScope } from '@/lib/address/detector'
import { SavedAddress } from '@/stores/addressBookStore'
import { NetworkScopeSelectorProps } from './NetworkScopeSelector'

const validKeys = (keys: string[] | undefined, options: { key: string }[]) => {
    const optionKeys = options.map(o => o.key)
    return (keys ?? []).filter(key => optionKeys.includes(key))
}

export function useNetworkScope(address: string, initial?: Partial<SavedAddress>, availableNetworks?: string[]): { selector: NetworkScopeSelectorProps | null, entry: Pick<SavedAddress, 'networkTypes' | 'networks'> } {
    const { networks } = useSettingsState()
    const [picked, setPicked] = useState<{ signature: string, keys: string[] } | null>(null)

    const trimmed = address.trim()
    const detected = useMemo(() => classifyAddress(trimmed), [trimmed])

    const signature = useMemo(
        () => `${detected.selection}:${detected.types.map(String).sort().join(',')}`,
        [detected.selection, detected.types]
    )

    const mode = useMemo<{
        selectorProps: Omit<NetworkScopeSelectorProps, 'selected' | 'onChange'>
        defaults: string[]
        saved?: string[]
        toEntry: (keys: string[]) => Pick<SavedAddress, 'networkTypes' | 'networks'>
    } | null>(() => {
        switch (detected.selection) {
            case AddressSelectionMode.Networks: {
                const type = detected.types[0]
                const scopedNetworks = networks.filter(n => detected.types.includes(n.type) && (!availableNetworks || availableNetworks.includes(n.name)))
                const options = scopedNetworks.map(n => ({ key: n.name, label: n.display_name, logo: n.logo }))
                return {
                    selectorProps: { sectionLabel: 'Networks', masterLabel: 'All networks', overlapping: false, options },
                    defaults: defaultNetworkScope(type, scopedNetworks),
                    saved: initial?.networks,
                    toEntry: keys => ({ networkTypes: detected.types, networks: keys }),
                }
            }
            case AddressSelectionMode.Overlap: {
                const options = detected.types.map(t => ({ key: t as string, label: AddressTypeLabel(t), logo: networks.find(n => n.type === t)?.logo }))
                return {
                    selectorProps: { sectionLabel: 'Network type', masterLabel: 'Both', overlapping: true, options },
                    defaults: options.map(o => o.key),
                    saved: initial?.networkTypes,
                    toEntry: keys => ({ networkTypes: keys as NetworkType[] }),
                }
            }
            default:
                return null
        }
    }, [detected, networks, availableNetworks, initial?.networks, initial?.networkTypes])

    const options = mode?.selectorProps.options ?? []
    const saved = validKeys(mode?.saved, options)
    const fallback = saved.length ? saved : (mode?.defaults ?? [])
    const selected = validKeys(picked?.signature === signature ? picked.keys : fallback, options)

    const entry = mode ? mode.toEntry(selected) : { networkTypes: detected.types.length ? detected.types : undefined }
    const selector = mode && options.length > 1
        ? { ...mode.selectorProps, selected, onChange: (keys: string[]) => setPicked({ signature, keys }) }
        : null

    return { selector, entry }
}
