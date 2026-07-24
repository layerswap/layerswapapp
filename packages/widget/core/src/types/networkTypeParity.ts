import { NetworkType } from "@/Models/Network";
import { NetworkType as UtilsNetworkType } from "@layerswap/utils";

/**
 * Compile-time drift guard for the duplicated `NetworkType`.
 *
 * `@layerswap/utils` is a leaf package and cannot import this widget model, so it
 * keeps its own copy of `NetworkType` (see `packages/utils/src/types.ts`). The
 * address providers there compare `network.type === NetworkType.EVM`, so if the two
 * enums ever drift — a member added/removed or a string value changed — validation
 * would silently break with no type error.
 *
 * This file contains no runtime logic of value; it exists purely so `tsc` fails the
 * build when the enums fall out of sync. To fix a failure here, make the two enums
 * match again (same keys, same string values).
 */

// Map each enum member to its underlying string-literal value, dropping the nominal
// enum branding so the two enums can be compared structurally.
type Stringify<T extends Record<string, string>> = { [K in keyof T]: `${T[K]}` };

// Resolves to `true` only when A and B are mutually assignable; otherwise `never`,
// which makes the assignment below fail to type-check.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _networkTypeParity: Exact<Stringify<typeof NetworkType>, Stringify<typeof UtilsNetworkType>> = true;
