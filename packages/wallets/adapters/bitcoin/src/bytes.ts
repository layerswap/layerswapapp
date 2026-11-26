export function sameBytes(left: Uint8Array | undefined, right: Uint8Array): boolean {
    return !!left && left.length === right.length && left.every((byte, index) => byte === right[index])
}

export function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0 || !/^[\da-f]*$/i.test(hex)) throw new Error('Invalid hex string')
    return Uint8Array.from(hex.match(/../g) ?? [], byte => parseInt(byte, 16))
}
