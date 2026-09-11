import { create } from 'zustand'
import { AUTO_RECEIVE_SETTINGS, type ReceiveSettings } from '../lib/receiveSettings'

type SlippageState = {
    receiveSettings: ReceiveSettings
    revision: number
    setReceiveSettings: (value: ReceiveSettings) => void
    resetMinimumForScope: (scope: string) => void
    slippage: number | undefined
    autoSlippage: boolean
    setSlippage: (value: number | undefined) => void
    setAutoSlippage: (value: boolean) => void
    clearSlippage: () => void
}

const selectionState = (receiveSettings: ReceiveSettings, revision: number) => ({
    receiveSettings,
    revision,
    slippage: receiveSettings.mode === 'slippage' ? Number(receiveSettings.percent) / 100 : undefined,
    autoSlippage: receiveSettings.mode === 'auto',
})

export const useSlippageStore = create<SlippageState>()((set) => ({
    receiveSettings: AUTO_RECEIVE_SETTINGS,
    revision: 0,
    setReceiveSettings: (value) => set(state => selectionState(value, state.revision + 1)),
    resetMinimumForScope: (scope) => set(state => state.receiveSettings.mode === 'minimum' && state.receiveSettings.scope !== scope ? selectionState(AUTO_RECEIVE_SETTINGS, state.revision + 1) : state),
    slippage: undefined,
    autoSlippage: true,
    setSlippage: (value) => set(state => selectionState(value === undefined ? AUTO_RECEIVE_SETTINGS : { mode: 'slippage', percent: String(value * 100) }, state.revision + 1)),
    setAutoSlippage: (value) => set(state => selectionState(value ? AUTO_RECEIVE_SETTINGS : state.receiveSettings.mode === 'auto' ? { mode: 'slippage', percent: '' } : state.receiveSettings, state.revision + 1)),
    clearSlippage: () => set(state => selectionState(AUTO_RECEIVE_SETTINGS, state.revision + 1))
}))
