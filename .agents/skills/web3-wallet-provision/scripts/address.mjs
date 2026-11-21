// Address checks never derive keys or contact a chain. The caller must observe the native address.
export async function validatePublicAddress(address,{family='evm',validator}={}) {
  if(typeof address!=='string' || address.trim()!==address || /[\s…]/.test(address))return false;
  if(typeof validator==='function')return await validator(address,family)===true;
  if(family==='evm')return /^0x[0-9a-fA-F]{40}$/.test(address);
  if(family==='starknet') {
    if(!/^0x[0-9a-fA-F]{1,64}$/.test(address))return false;
    const value=BigInt(address);
    return value>0n && value<(1n<<251n);
  }
  if(family==='fuel')return /^0x[0-9a-fA-F]{64}$/.test(address);
  // Reuse the app's or vendor SDK's checksum-aware validator for other address encodings.
  throw new Error('CHAIN_ADDRESS_VALIDATOR_REQUIRED');
}
