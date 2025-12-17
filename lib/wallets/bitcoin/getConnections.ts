import { Config } from "@bigmi/client"
import { Compute, deepEqual } from "@bigmi/core"
// @ts-ignore
import { Connection } from "@bigmi/client/dist/esm/types/connection"

export type GetConnectionsReturnType = Compute<Connection>[]

let previousConnections: Connection[] = []

export function getConnections(config: Config): GetConnectionsReturnType {
  const connections = [...config.state.connections.values()]
  if (config.state.status === 'reconnecting') return previousConnections
  if (deepEqual(previousConnections, connections)) return previousConnections
  previousConnections = connections
  return connections
}
