'use client'

import {
  type Config,
  type GetAccountReturnType,
  getAccount,
  watchAccount,
} from '@bigmi/client'
import { useSyncExternalStoreWithTracked } from './useSyncExternalStoreWithTracked'
import { useConfig } from '@bigmi/react'
// @ts-ignore
import { ResolvedRegister } from '@bigmi/react/dist/esm/types'
// @ts-ignore
import { ConfigParameter } from '@bigmi/react/dist/esm/hooks/useConfig'

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
    () => getAccount(config)
  )
}