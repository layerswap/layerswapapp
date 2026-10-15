'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayerswapDepositWidget } from '@layerswap/widget-react';
import { useWalletSession } from './auth/context';
import { foresightLayerswapColorOverrides, foresightLayerswapTheme } from '@/lib/layerswap-theme';
import { getAppOrigin } from '@/lib/app-origin';

export type DepositMethod = 'polymarket'|'wallet'|'deposit_address'|'hyperliquid';
export type DepositRequest = {id:number;method:DepositMethod|null;address:`0x${string}`};
const destination = {network:process.env.NEXT_PUBLIC_DEPOSIT_NETWORK || 'BASE_MAINNET',tokens:[process.env.NEXT_PUBLIC_DEPOSIT_TOKEN || 'USDC']};
const apiKey = process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY || '';
const config = {apiKey,version:'mainnet' as const,theme:foresightLayerswapTheme};
const walletProvidersConfig = {include:['evm' as const,'solana' as const]};
const appUrl = getAppOrigin();
const walletDefaults = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ? {walletConnect:{projectId:process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,name:'Foresight',description:'Fund your Foresight wallet',url:appUrl,icons:[`${appUrl}/icon.svg`]}} : undefined;

export default function DepositWidget({address,request,onComplete,onStatus}:{address:`0x${string}`;request:DepositRequest|null;onComplete:()=>void;onStatus:(message:string)=>void}) {
  const {wagmiConfig} = useWalletSession();
  const host = useRef<HTMLDivElement>(null);
  const openedRequest = useRef<number|null>(null);
  const latestRequest = useRef(request);
  latestRequest.current=request;
  const loadFailed = useRef(false);
  const [retryKey,setRetryKey] = useState(0);
  const methods = useMemo(()=>request?.method?[request.method]:undefined,[request?.method]);
  const callbacks = useMemo(()=>({
    onSwapComplete:onComplete,
    onError:()=>onStatus('The deposit could not be completed. Check the Layerswap modal for details.'),
  }),[onStatus,onComplete]);
  const handleLoadError = useCallback(()=>{
    loadFailed.current=true;
    if(latestRequest.current && openedRequest.current!==latestRequest.current.id){
      onStatus('Layerswap could not load. Check your connection and widget API key, then click Deposit to retry.');
    }
  },[onStatus]);

  useEffect(()=>{
    if(!request || openedRequest.current===request.id)return;
    // Keep the verified remote and its providers alive between deposits.
    // A fresh mount is needed only to recover from a failed CDN load.
    if(loadFailed.current){loadFailed.current=false;setRetryKey(key=>key+1);}
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
    <LayerswapDepositWidget key={retryKey} config={config} destination={destination} destinationAddress={address}
      mode="button" buttonLabel="Deposit" buttonClassName="layerswap-deposit-trigger"
      methods={methods} walletProvidersConfig={walletProvidersConfig} walletDefaults={walletDefaults} wagmiConfig={wagmiConfig}
      showDestinationAddress title="Add funds" callbacks={callbacks} fallback={null}
      onError={handleLoadError}/>
  </div>;
}
