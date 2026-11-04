'use client';
import { useEffect, useMemo, useRef } from 'react';
import { Deposit } from '@layerswap/widget/deposit';
import { getDefaultProviders } from '@layerswap/wallets';
import '@layerswap/widget/index.css';
import { foresightLayerswapColorOverrides, foresightLayerswapTheme } from '@/lib/layerswap-theme';
import { getAppOrigin } from '@/lib/app-origin';

export type DepositMethod = 'polymarket'|'wallet'|'deposit_address'|'hyperliquid';
export type DepositRequest = {id:number;method:DepositMethod|null;address:`0x${string}`};
const destination = {network:process.env.NEXT_PUBLIC_DEPOSIT_NETWORK || 'BASE_MAINNET',tokens:[process.env.NEXT_PUBLIC_DEPOSIT_TOKEN || 'USDC']};
const apiKey = process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY || '';
const baseConfig = {apiKey,version:'mainnet' as const,theme:foresightLayerswapTheme};
const appUrl = getAppOrigin();
const walletDefaults = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ? {walletConnect:{projectId:process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,name:'Foresight',description:'Fund your Foresight wallet',url:appUrl,icons:[`${appUrl}/icon.svg`]}} : undefined;
const walletProviders = getDefaultProviders(walletDefaults ?? {});

export default function DepositWidget({address,request,loginAddress,onComplete,onStatus}:{address:`0x${string}`;request:DepositRequest|null;loginAddress?:`0x${string}`|null;onComplete:()=>void;onStatus:(message:string)=>void}) {
  const host = useRef<HTMLDivElement>(null);
  const openedRequest = useRef<number|null>(null);
  // The Privy embedded wallet: Layerswap binds wallet methods to it and never disconnects or replaces it.
  const config = useMemo(()=>loginAddress?{...baseConfig,loginWallet:{address:loginAddress,providerId:'evm' as const}}:baseConfig,[loginAddress]);
  const methods = useMemo(()=>request?.method?[request.method]:undefined,[request?.method]);
  const callbacks = useMemo(()=>({
    onSwapComplete:onComplete,
    onError:()=>onStatus('The deposit could not be completed. Check the Layerswap modal for details.'),
  }),[onStatus,onComplete]);

  useEffect(()=>{
    if(!request || openedRequest.current===request.id)return;
    // Forward app Deposit buttons to the SDK's documented dialog trigger.
    // A click during background loading waits for the same in-flight mount.
    let timeout:ReturnType<typeof setTimeout>;
    const loadingNotice=setTimeout(()=>onStatus('Loading Layerswap…'),300);
    const open=()=>{
      const trigger=host.current?.querySelector<HTMLButtonElement>('.layerswap-deposit-trigger');
      if(!trigger||trigger.disabled||openedRequest.current===request.id)return;
      openedRequest.current=request.id;
      observer.disconnect();
      clearTimeout(timeout);
      clearTimeout(loadingNotice);
      onStatus('');
      trigger.click();
    };
    const observer=new MutationObserver(open);
    if(host.current)observer.observe(host.current,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
    timeout=setTimeout(()=>{
      observer.disconnect();
      clearTimeout(loadingNotice);
      onStatus('Layerswap could not open. Check your connection and widget API key, then click Deposit to retry.');
    },20000);
    open();
    return()=>{observer.disconnect();clearTimeout(timeout);clearTimeout(loadingNotice);};
  },[request,onStatus]);

  return <div ref={host}>
    <style>{foresightLayerswapColorOverrides}</style>
    <Deposit config={config} walletProviders={walletProviders} destination={destination} destinationAddress={address}
      mode="button" buttonLabel="Deposit" buttonClassName="layerswap-deposit-trigger"
      methods={methods} showDestinationAddress title="Add funds" callbacks={callbacks}/>
  </div>;
}
