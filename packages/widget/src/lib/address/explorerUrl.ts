/**
 * Safely resolves an explorer URL template by replacing placeholders with encoded address
 * Prevents URL injection attacks by properly encoding the address parameter
 *
 * @param template - Explorer URL template (e.g., "https://etherscan.io/address/{0}")
 * @param address - Address to insert into template
 * @returns Encoded URL string, or empty string if inputs are invalid
 *
 * @example
 * ```typescript
 * const url = getExplorerUrl("https://etherscan.io/address/{0}", "0x123abc");
 * // Returns: "https://etherscan.io/address/0x123abc" (properly encoded)
 * ```
 */
export function getExplorerUrl(template: string | undefined | null, address: string | undefined | null): string {
  if (!template || !address) return '';

  // Encode the address to prevent URL injection
  const encodedAddress = encodeURIComponent(address);

  // Replace the {0} placeholder with the encoded address
  return template.replace('{0}', encodedAddress);
}
