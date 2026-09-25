import { formatUnits } from './formatUnits.js'

export type StorageType = 'localStorage' | 'sessionStorage'

export function bytesToHex(value: Uint8Array): string {
    return Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function baseUnitsToNumber(value: bigint, decimals: number): number {
    if (!Number.isSafeInteger(decimals) || decimals < 0) {
        throw new RangeError('Decimals must be a non-negative safe integer')
    }

    const result = Number(formatUnits(value, decimals))
    if (!Number.isFinite(result)) throw new RangeError('Base-unit value is outside the finite number range')
    return result
}

export function classNames(...classes: (string | boolean | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ')
}

export function checkStorageIsAvailable(type: StorageType): boolean {
    if (typeof window === 'undefined') return false

    try {
        const storage = window[type]
        const key = '__storage_test__'
        storage.setItem(key, key)
        storage.removeItem(key)
        return true
    } catch {
        return false
    }
}

export function isInIframe(): boolean {
    if (typeof window === 'undefined') return false

    try {
        return window.self !== window.top
    } catch {
        return true
    }
}

export function groupBy<T, K extends PropertyKey>(
    list: readonly T[],
    getKey: (item: T) => K,
): Record<K, T[]> {
    return list.reduce((groups, item) => {
        const key = getKey(item)
        if (!groups[key]) groups[key] = []
        groups[key].push(item)
        return groups
    }, {} as Record<K, T[]>)
}

export function formatUsd(amount: number | undefined | null): string {
    if (amount === undefined || amount === null) return '$0.00'
    if (amount > 0 && amount < 0.01) return '<$0.01'
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)
}

export function floorUsd(value: number): string {
    const cents = Math.floor(value * 100 + 1e-9)
    return (cents / 100).toFixed(2).replace(/\.?0+$/, '')
}

export function ceilUsd(value: number): string {
    const cents = Math.ceil(value * 100 - 1e-9)
    return (cents / 100).toFixed(2).replace(/\.?0+$/, '')
}

export function getDateDifferenceString(fromDate: Date, toDate: Date = new Date()): string {
    let years = toDate.getFullYear() - fromDate.getFullYear()
    let months = toDate.getMonth() - fromDate.getMonth()
    let days = toDate.getDate() - fromDate.getDate()

    if (days < 0) {
        months -= 1
        days += new Date(toDate.getFullYear(), toDate.getMonth(), 0).getDate()
    }

    if (months < 0) {
        years -= 1
        months += 12
    }

    const parts: string[] = []
    if (years > 0) {
        const totalDays = days + months * 30
        parts.push(`${years} year${years === 1 ? '' : 's'}`)
        if (totalDays > 0) parts.push(`${totalDays} day${totalDays === 1 ? '' : 's'}`)
    } else if (months > 0) {
        parts.push(`${months} month${months === 1 ? '' : 's'}`)
        if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`)
    } else if (days > 0) {
        parts.push(`${days} day${days === 1 ? '' : 's'}`)
    }

    return parts.length > 0 ? `(${parts.join(', ')} ago)` : ''
}

export function isGuid(value: string): boolean {
    const normalized = value?.[0] === '{' ? value.substring(1, value.length - 1) : value
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(normalized)
}

export function isDiffByPercent(
    a: number | null | undefined,
    b: number | null | undefined,
    percent: number,
): boolean {
    return Math.abs(Number(a) - Number(b)) / Math.abs(Number(a)) > percent / 100
}
