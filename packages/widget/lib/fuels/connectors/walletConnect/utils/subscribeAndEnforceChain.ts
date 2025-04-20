import {
    type Config,
    type State,
    disconnect,
    getChains,
    switchChain,
  } from '@wagmi/core';
  
  function getCurrentChainId(state: Pick<State, 'connections' | 'current'>) {
    return state.current
      ? state.connections.get(state.current)?.chainId
      : undefined;
  }
  
  export function subscribeAndEnforceChain(config: Config) {
    if (!config) throw new Error('config is required');
  
    config.subscribe(
      (state) => ({
        connections: state.connections,
        status: state.status,
        current: state.current,
      }),
      (state, _prev) => {
        const chains = getChains(config);
        if (state.status !== 'connected' || state.current == null) return;
        const connector = state.connections.get(state.current)?.connector;
        const currentChain = getCurrentChainId(state);
        if (
          currentChain != null &&
          !chains.some((chain) => chain.id === currentChain)
        ) {
          // Some EVM Wallets (like MetaMask) will auto-reject calls made too quickly.
          setTimeout(() => {
            switchChain(config, {
              chainId: chains[0].id,
              connector,
            }).catch((error) => {
              console.log(error);
              disconnect(config);
            });
          }, 2000);
        }
      },
      {
        equalityFn: (a, b) => {
          return (
            getCurrentChainId(a) === getCurrentChainId(b) && a.status === b.status
          );
        },
      },
    );
    // wagmiCo
  }