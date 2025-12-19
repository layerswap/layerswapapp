'use client'

import {
  type Config,
  type GetAccountReturnType,
  getAccount,
  watchAccount,
} from '@bigmi/client'

// @ts-ignore
import type { ResolvedRegister } from '@bigmi/react/dist/esm/types'
// @ts-ignore
import { type ConfigParameter } from '@bigmi/react/dist/esm/hooks/useConfig'
import { useSyncExternalStoreWithTracked } from './useSyncExternalStoreWithTracked.js'
import { useConfig } from '@bigmi/react'

export type UseAccountParameters<config extends Config = Config> =
  ConfigParameter<config>

export type UseAccountReturnType<config extends Config = Config> =
  GetAccountReturnType<config>

export function useAccount<C extends Config = ResolvedRegister['config']>(
  parameters: UseAccountParameters<C> = {}
): UseAccountReturnType<C> {
  const config = useConfig(parameters)

  return useSyncExternalStoreWithTracked(
    (onChange) => watchAccount(config, { onChange }),
    () => getAccount(config),
    undefined // Pass undefined for getServerSnapshot to avoid infinite loop from non-cached object references
  )
}