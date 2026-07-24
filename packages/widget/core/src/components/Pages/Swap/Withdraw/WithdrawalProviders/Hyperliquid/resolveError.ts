/** User-facing error copy for the Hyperliquid withdraw step. The mapping from raw
 * Hyperliquid `/exchange` error strings now lives in the wallet package's
 * `createHyperliquidTransferProvider`, which returns ready-to-render header/details. */
export type StepError = { header: string; details: string }
