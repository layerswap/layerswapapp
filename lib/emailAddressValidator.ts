export function isValidEmailAddress(address: string): boolean {
    if (/(.+)@(.+){2,}\.(.+){2,}/.test(address)) {
        return true
    }

    return false;
}