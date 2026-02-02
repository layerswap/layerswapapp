/**
 * Shortens arbitrary strings (transaction hashes, swap IDs, GUIDs, etc.)
 * This is NOT for addresses - use the Address class from @/lib/address for that.
 *
 * @param str - The string to shorten (transaction hash, swap ID, etc.)
 * @returns Shortened string in format "first5...last4"
 */
export default function shortenString(str: string) {
    if (!str || str.length < 13) {
        return str;
    }
    return `${str.substring(0, 5)}...${str.substring(str.length - 4)}`;
}
