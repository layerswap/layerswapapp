// Function to decode a Base58 string
export default function decodeBase58(base58Str) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const BASE = 58;

    let num = 0n; // Use BigInt for large numbers

    // Decode Base58 string to a BigInt
    for (let char of base58Str) {
        let charIndex = ALPHABET.indexOf(char);
        num = num * BigInt(BASE) + BigInt(charIndex);
    }

    // Convert BigInt to a byte array
    let hex = num.toString(16);
    if (hex.length % 2 !== 0) {
        hex = '0' + hex; // Ensure even length for proper byte representation
    }
    let bytes = Array.from(Buffer.from(hex, 'hex'));

    // Add leading zero bytes for each '1' in the original Base58 string
    let leadingZeroes = 0;
    for (let char of base58Str) {
        if (char === '1') {
            leadingZeroes++;
        } else {
            break;
        }
    }
    // Prepend zero bytes for each leading '1'
    bytes = new Array(leadingZeroes).fill(0).concat(bytes);

    // Remove the last 4 bytes (checksum) from the decoded data
    if (bytes.length > 4) {
        bytes = bytes.slice(0, -4);
    }

    // Convert byte array to hex string
    let resultHex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');

    return resultHex;
}