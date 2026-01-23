import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function shortenAddress(address: string) {
  if (address?.startsWith('ronin:')) {
    var stringAddress = address.replace('ronin:', '')
    return `ronin:${InnerShortenAddress(stringAddress)}`
  } else if (address?.startsWith('zksync:')) {
    var stringAddress = address.replace('zksync:', '')
    return `zksync:${InnerShortenAddress(stringAddress)}`
  } else {
    return InnerShortenAddress(address)
  }

  function InnerShortenAddress(address: string) {
    if (address?.length < 13)
      return address;
    return `${address?.substring(0, 20)}...${address?.substring(address?.length - 10, address?.length)}`
  }
}
export const shortenEmail = (email = '') => {
  const [name, domain] = email.split('@');
  const { length: len } = name;
  const maskedName = name?.[0] + '...' + name[len - 1];
  const maskedEmail = maskedName + '@' + domain;
  return maskedEmail;
};

export function shortenHash(address: string) {
  if (address?.length < 13)
    return address;
  return `${address?.substring(0, 8)}...${address?.substring(address?.length - 8, address?.length)}`
}