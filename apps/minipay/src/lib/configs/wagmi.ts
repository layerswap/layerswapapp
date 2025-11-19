import { createConfig, http, injected } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";

export const config = createConfig({
    chains: [celo, celoAlfajores],
    connectors: [
        injected(), // should be listed first
    ],
    transports: {
        [celo.id]: http(),
        [celoAlfajores.id]: http(),
    },
});