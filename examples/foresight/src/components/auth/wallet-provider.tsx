'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { WalletContext } from './context';
import { BrandMark } from '../artwork';

const ConfiguredProvider = dynamic(() => import('./configured-provider'), {
  ssr: false,
  loading: () => <div className="wallet-startup" role="status"><div className="brand"><BrandMark/><span>foresight<span className="brand-period">.</span></span></div><p>Preparing your wallet connection…</p></div>,
});
const configured = Boolean(process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID);
type InjectedProvider = {
  request: (args: { method: string }) => Promise<unknown>;
  on?: (event:string, callback:(accounts:string[])=>void) => void;
  removeListener?: (event:string, callback:(accounts:string[])=>void) => void;
};
function getInjected() { return (window as unknown as {ethereum?:InjectedProvider}).ethereum; }
function BasicProvider({ children }: {children:React.ReactNode}) {
  const [address,setAddress] = useState<`0x${string}` | null>(null);
  useEffect(() => {
    const provider = getInjected();
    if (!provider) return;
    const changed = (accounts:string[]) => {
      if(sessionStorage.getItem('foresight-wallet-connected'))setAddress((accounts[0] as `0x${string}`) || null);
    };
    // Reconnect only a session previously authorized in this browser.
    if (sessionStorage.getItem('foresight-wallet-connected')) {
      provider.request({method:'eth_accounts'}).then(a=>changed(a as string[])).catch(()=>{});
    }
    provider.on?.('accountsChanged',changed);
    return ()=>provider.removeListener?.('accountsChanged',changed);
  },[]);
  const connectWallet = useCallback(async()=>{
    const provider = getInjected();
    if (!provider) throw new Error('Add NEXT_PUBLIC_REOWN_PROJECT_ID to enable WalletConnect, or install a browser wallet to connect directly.');
    const accounts = await provider.request({method:'eth_requestAccounts'}) as string[];
    if (!accounts[0]) throw new Error('No wallet account was shared. Try connecting again.');
    setAddress(accounts[0] as `0x${string}`);
    sessionStorage.setItem('foresight-wallet-connected','true');
  },[]);
  const login = useCallback(async()=>{throw new Error('Email and social login will be available after NEXT_PUBLIC_PRIVY_APP_ID is configured.');},[]);
  const disconnect = useCallback(async()=>{
    setAddress(null); sessionStorage.removeItem('foresight-wallet-connected');
  },[]);
  const value = useMemo(()=>({address,email:null,authenticated:Boolean(address),method:address?'wallet' as const:null,ready:true,reownConfigured:false,privyConfigured:false,connectWallet,login,disconnect}),[address,connectWallet,login,disconnect]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
export default function WalletProvider({children}:{children:React.ReactNode}) {
  return configured ? <ConfiguredProvider>{children}</ConfiguredProvider> : <BasicProvider>{children}</BasicProvider>;
}
