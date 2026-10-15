'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { base, mainnet, polygon, arbitrum, optimism } from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { WagmiProvider, useAccount, useDisconnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { WalletContext } from './context';
import { getAppOrigin } from '@/lib/app-origin';

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;
const privyId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const networks = [base, polygon, mainnet, arbitrum, optimism] as [typeof base, ...Array<typeof polygon | typeof mainnet | typeof arbitrum | typeof optimism>];
const adapter = projectId ? new WagmiAdapter({ projectId, networks, ssr: true }) : null;
const appUrl = getAppOrigin();
const modal = adapter && projectId ? createAppKit({
  adapters: [adapter], projectId, networks, defaultNetwork: base,
  metadata: { name: 'Foresight', description: 'Foresight prediction market demo', url: appUrl, icons: [new URL('/icon.svg', appUrl).href] },
  themeMode: 'light', themeVariables: { '--w3m-accent': '#7655e8', '--w3m-border-radius-master': '2px' },
  features: { analytics: false, email: false, socials: false, swaps: false, onramp: false },
}) : null;
type Address = `0x${string}` | null;
type PrivyState = {address:Address;email:string|null;authenticated:boolean;ready:boolean};
type Actions = {login?:()=>void;logout?:()=>Promise<void>;disconnect?:()=>void};
function ReownBridge({onAddress, actions}:{onAddress:(a:Address)=>void;actions:React.RefObject<Actions>}) {
  const {address,isConnected} = useAccount();
  const {disconnect} = useDisconnect();
  useEffect(()=>onAddress(isConnected && address ? address : null),[address,isConnected,onAddress]);
  useEffect(()=>{actions.current.disconnect=disconnect;},[actions,disconnect]);
  return null;
}
function PrivyBridge({onState,actions}:{onState:(s:PrivyState)=>void;actions:React.RefObject<Actions>}) {
  const {ready,authenticated,user,login,logout} = usePrivy();
  const {wallets,ready:walletsReady} = useWallets();
  const address = (wallets.find(w=>w.walletClientType==='privy')?.address || user?.wallet?.address || null) as Address;
  const email = user?.email?.address || null;
  useEffect(()=>onState({address,email,authenticated,ready:ready && (!authenticated || walletsReady)}),[address,email,authenticated,ready,walletsReady,onState]);
  useEffect(()=>{actions.current.login=login;actions.current.logout=logout;},[actions,login,logout]);
  return null;
}
function Session({children}:{children:React.ReactNode}) {
  const [reownAddress,setReownAddress] = useState<Address>(null);
  const [privy,setPrivy] = useState<PrivyState>({address:null,email:null,authenticated:false,ready:!privyId});
  const [method,setMethod] = useState<'wallet'|'privy'|null>(null);
  const actions = useRef<Actions>({});
  const connectWallet = useCallback(async()=>{
    if (!modal) throw new Error('Set NEXT_PUBLIC_REOWN_PROJECT_ID to enable WalletConnect.');
    setMethod('wallet'); await modal.open({view:'Connect'});
  },[]);
  const login = useCallback(async()=>{
    if (!privyId) throw new Error('Set NEXT_PUBLIC_PRIVY_APP_ID to enable email and social login.');
    if (!actions.current.login || !privy.ready) throw new Error('Login is getting ready. Please try again in a moment.');
    setMethod('privy');actions.current.login();
  },[privy.ready]);
  const disconnect = useCallback(async()=>{
    actions.current.disconnect?.();
    if (privy.authenticated) await actions.current.logout?.();
    setReownAddress(null);setMethod(null);
  },[privy.authenticated]);
  const activeMethod = method || (reownAddress ? 'wallet' : privy.authenticated ? 'privy' : null);
  const address = activeMethod==='privy' ? privy.address : reownAddress;
  const value = useMemo(()=>({address,email:activeMethod==='privy'?privy.email:null,authenticated:Boolean(address)||(activeMethod==='privy'&&privy.authenticated),method:activeMethod,ready:privy.ready,reownConfigured:Boolean(projectId),privyConfigured:Boolean(privyId),wagmiConfig:activeMethod==='wallet'?adapter?.wagmiConfig:undefined,connectWallet,login,disconnect}),[address,activeMethod,privy,connectWallet,login,disconnect]);
  return <WalletContext.Provider value={value}>
    {adapter?<ReownBridge onAddress={setReownAddress} actions={actions}/>:null}
    {privyId?<PrivyBridge onState={setPrivy} actions={actions}/>:null}
    {children}
  </WalletContext.Provider>;
}
export default function ConfiguredProvider({children}:{children:React.ReactNode}) {
  const [queryClient] = useState(()=>new QueryClient());
  let content = <Session>{children}</Session>;
  if (adapter) content = <WagmiProvider config={adapter.wagmiConfig}><QueryClientProvider client={queryClient}>{content}</QueryClientProvider></WagmiProvider>;
  if (privyId) content = <PrivyProvider appId={privyId} clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || undefined} config={{
    loginMethods:['email','google'],
    appearance:{theme:'light',accentColor:'#7655e8',logo:'/icon.svg'},
    defaultChain:base,supportedChains:[base,polygon,mainnet,arbitrum,optimism],
    embeddedWallets:{ethereum:{createOnLogin:'users-without-wallets'}},
  }}>{content}</PrivyProvider>;
  return content;
}
