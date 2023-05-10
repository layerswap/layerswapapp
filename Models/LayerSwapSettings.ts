import { BlacklistedAddress } from "./BlacklistedAddress";
import { CryptoNetwork } from "./CryptoNetwork";
import { Currency } from "./Currency";
import { Exchange } from "./Exchange";
import { Layer } from "./Layer";
import { Partner } from "./Partner";


export class LayerSwapSettings {
    exchanges: Exchange[];
    networks: CryptoNetwork[];
    currencies: Currency[];
    blacklisted_addresses: BlacklistedAddress[];
    discovery: {
        identity_url: string;
        resource_storage_url: string;
    }
    validSignatureisPresent?: boolean;
};
