export function roundDecimals(value: number, decimals: number) {
    if (decimals === 1) {
        decimals = 0
    }
    return Number(Math.ceil(Number(value + 'e' + decimals)) + 'e-' + decimals);
}

export function truncateDecimals(value: number, decimals = 0) {
    if (value === 0) return '0';

    const factor = Math.pow(10, decimals);
    const truncated = Math.trunc(value * factor) / factor;

    const formatted = isScientific(truncated)
        ? (!isNaN(Number(truncated))
            ? truncated.toFixed(decimals).replace(/\.?0+$/, '')
            : '')
        : truncated?.toString();

    return Number(formatted).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
    });
}

export function truncateDecimalsToFloor(number: number, decimalPlaces: number) {
    let factor = Math.pow(10, decimalPlaces);
    return Math.floor(number * factor) / factor;
}

export function findIndexOfFirstNonZeroAfterComma(number) {
    // Convert the number to a string
    let numberStr = number.toString();

    // Find the position of the decimal point
    let decimalIndex = numberStr.indexOf('.');

    // If there's no decimal point, return null
    if (decimalIndex === -1) {
        return null;
    }

    // Loop through the characters after the decimal point
    for (let i = decimalIndex + 1; i < numberStr.length; i++) {
        if (numberStr[i] !== '0') {
            return i - decimalIndex; // Position after the decimal point
        }
    }

    // If no non-zero number was found, return null
    return null;
}

export function isScientific(x) {
    const s = String(x);

    // 1) If it’s already a string that “looks like” sci-notation, catch it:
    if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(s)) {
        return true;
    }

    // 2) Otherwise, convert to Number (in case it's a numeric string or other) 
    //    and see if toString() uses 'e' (lowercased for consistency):
    return Number(s).toString().toLowerCase().includes('e');
}