import * as _Account from './account';
import * as _Config from './config';
// import * as _Signer from './ethereum- signer.js';
import * as _ParaclearProvider from './paraclear-provider';

export const Config = { fetchConfig: _Config.fetchConfig };

export const Account = {
//   fromEthSigner: _Account.fromEthSigner,
  fromStarknetAccount: _Account.fromStarknetAccount,
};

// export const Signer = { ethersSignerAdapter: _Signer.ethersSignerAdapter };

export const ParaclearProvider = {
  DefaultProvider: _ParaclearProvider.DefaultProvider,
};

// export const Paraclear = {
//   getTokenBalance: _Paraclear.getTokenBalance,
//   getSocializedLossFactor: _Paraclear.getSocializedLossFactor,
//   getReceivableAmount: _Paraclear.getReceivableAmount,
//   withdraw: _Paraclear.withdraw,
// };