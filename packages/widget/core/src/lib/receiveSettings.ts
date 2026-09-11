export type ReceiveSettings =
    | { mode: 'auto' }
    | { mode: 'slippage'; percent: string }
    | { mode: 'minimum'; amount: string; scope: string; precision: number }

export const AUTO_RECEIVE_SETTINGS: ReceiveSettings = { mode: 'auto' }

type ReceiveScope = {
    amount?: string | number
    from?: string
    fromCurrency?: string
    to?: string
    toCurrency?: string
    depositMethod?: string
}

// Compare decimal amounts without converting them to floating point numbers.
export function receiveSettingsScope({ amount, from, fromCurrency, to, toCurrency, depositMethod }: ReceiveScope): string {
    const rawAmount = typeof amount === 'number' ? quotedMinimumInput(amount) : amount ?? ''
    const normalizedAmount = rawAmount.replace(/^\./, '0.').replace(/^0+(?=\d)/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
    return JSON.stringify([from, fromCurrency, to, toCurrency, normalizedAmount, depositMethod])
}

export function formReceiveSettingsScope(values: {
    amount?: string | number
    from?: { name: string }
    fromAsset?: { symbol: string }
    to?: { name: string }
    toAsset?: { symbol: string }
    depositMethod?: string
}): string {
    return receiveSettingsScope({
        amount: values.amount,
        from: values.from?.name,
        fromCurrency: values.fromAsset?.symbol,
        to: values.to?.name,
        toCurrency: values.toAsset?.symbol,
        depositMethod: values.depositMethod,
    })
}

// Compare canonical token identifiers, independently of the selected networks.
export function isTokenSwap(sourceToken: string | undefined, destinationToken: string | undefined): boolean {
    return !!sourceToken && !!destinationToken && sourceToken !== destinationToken
}

export function resolveReceiveSettings(settings: ReceiveSettings, scope: string, supportsSlippage: boolean): ReceiveSettings {
    if (!supportsSlippage) return AUTO_RECEIVE_SETTINGS
    return settings.mode === 'minimum' && settings.scope !== scope ? AUTO_RECEIVE_SETTINGS : settings
}

const DECIMAL = /^(?:\d+(?:\.\d*)?|\.\d+)$/

export function receiveSettingsError(settings: ReceiveSettings): string | undefined {
    if (settings.mode === 'auto') return undefined
    if (settings.mode === 'slippage') {
        const percent = Number(settings.percent)
        if (!DECIMAL.test(settings.percent) || !Number.isFinite(percent) || percent < 0.1 || percent > 5) {
            return 'Slippage must be between 0.1% and 5%.'
        }
        return undefined
    }

    if (!DECIMAL.test(settings.amount) || !Number.isFinite(Number(settings.amount)) || !/[1-9]/.test(settings.amount)) {
        return 'Enter a minimum receive amount greater than zero.'
    }
    const fraction = (settings.amount.split('.')[1] ?? '').replace(/0+$/, '')
    if (fraction.length > settings.precision) {
        return `Minimum receive supports up to ${settings.precision} decimal places.`
    }
    return undefined
}

export type ReceiveRequestParams =
    | { slippage: string; min_receive_amount?: never }
    | { min_receive_amount: string; slippage?: never }
    | { slippage?: never; min_receive_amount?: never }

// Shared by quote and create-swap: only send the input the user selected.
export function receiveRequestParams(settings: ReceiveSettings): ReceiveRequestParams {
    const error = receiveSettingsError(settings)
    if (error) throw new Error(error)
    if (settings.mode === 'minimum') return { min_receive_amount: settings.amount }
    if (settings.mode === 'slippage') return { slippage: String(Number(settings.percent) / 100) }
    return {}
}

// Expand scientific notation from numeric API responses without rounding up a floor.
export function quotedMinimumInput(amount: number | undefined): string {
    if (amount === undefined || !Number.isFinite(amount)) return ''
    const [coefficient, exponent] = String(amount).split('e')
    if (exponent === undefined) return coefficient
    const [whole, fraction = ''] = coefficient.split('.')
    const digits = whole + fraction
    const point = whole.length + Number(exponent)
    if (point <= 0) return `0.${'0'.repeat(-point)}${digits}`
    if (point >= digits.length) return digits + '0'.repeat(point - digits.length)
    return `${digits.slice(0, point)}.${digits.slice(point)}`
}
