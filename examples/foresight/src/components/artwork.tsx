import { Building2, Landmark, Music2, Rocket, Trophy } from 'lucide-react';
import Image from 'next/image';

export function BrandMark({className=''}:{className?:string}) {
  return <svg className={className} width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M3 23V9l12-6v14L3 23Z" fill="currentColor"/><path d="M17 3v14l12 6V9L17 3Z" fill="currentColor"/><path d="m16 19 12 6-12 6-12-6 12-6Z" fill="currentColor"/></svg>;
}
export function PolymarketMark({className=''}:{className?:string}) {
  return <Image className={className} src="https://layerswap.io/app/images/polymarket.png" width={108} height={108} alt="" unoptimized/>;
}
export function LayerswapMark() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 8 8-4 8 4-8 4-8-4Zm0 5 8 4 8-4M4 18l8 4 8-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
export function DepositArtwork() {
  return <div className="deposit-art" aria-hidden="true">
    <svg className="transfer-track" viewBox="0 0 410 245" fill="none"><path d="M65 151c42 65 115 70 163 16S308 61 375 91" stroke="#d8cdf6" strokeWidth="1.4" strokeDasharray="4 5"/><path d="M74 87c48-22 86-10 121 19s95 28 142-10" stroke="#c6b4f1" strokeWidth="2"/><path d="m320 90 18 5-12 14" stroke="#c6b4f1" strokeWidth="2"/><ellipse cx="201" cy="217" rx="143" ry="14" fill="#ddd3f2" opacity=".5"/></svg>
    <div className="art-float float-usdc"><Image src="https://cdn.layerswap.io/layerswap/currencies/usdc.png" width={28} height={28} alt="" unoptimized/><div>USDC<small>Ready for your next move</small></div><svg width="16" height="16" viewBox="0 0 20 20"><path d="m5 10 3 3 7-7" stroke="#4ba47b" strokeWidth="2" fill="none"/></svg></div>
    <div className="platform-tile polymarket-tile"><PolymarketMark/></div>
    <div className="art-transfer"><svg width="32" height="28" viewBox="0 0 32 28" fill="none"><path d="M3 9h25m-7-6 7 6-7 6M29 20H4m7-6-7 6 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
    <div className="platform-tile foresight-tile"><BrandMark/></div>
    <div className="art-float float-deposit"><span className="small-check">✓</span> One deposit. More possibilities.</div>
    <span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✦</span>
  </div>;
}
export function MarketArt({kind}:{kind:string}) {
  if (kind==='bitcoin') return <span className="market-art bitcoin-art">₿</span>;
  if (kind==='ethereum') return <span className="market-art eth-art"><svg width="25" height="34" viewBox="0 0 25 38"><path d="m12.5 0 12 20-12 7-12-7L12.5 0Z" fill="#7288c7"/><path d="M12.5 0v27l12-7-12-20Z" fill="#455d9d"/><path d="m.5 23 12 7 12-7-12 15-12-15Z" fill="#7288c7"/><path d="M12.5 30v8l12-15-12 7Z" fill="#455d9d"/></svg></span>;
  if (kind==='capitol') return <span className="market-art capitol-art"><Landmark size={30} strokeWidth={1.5}/></span>;
  if (kind==='football') return <span className="market-art football-art"><Trophy size={29} strokeWidth={1.6}/></span>;
  if (kind==='fed') return <span className="market-art fed-art"><Building2 size={29} strokeWidth={1.5}/></span>;
  if (kind==='rocket') return <span className="market-art rocket-art"><Rocket size={30} strokeWidth={1.6}/></span>;
  if (kind==='music') return <span className="market-art music-art"><Music2 size={28} strokeWidth={1.7}/></span>;
  return <span className="market-art apple-art"><svg viewBox="0 0 24 24" width="31" height="31" fill="currentColor"><path d="M16.3 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.1-2.9.9-3.6.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1.9-3.9 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.2 1.2 0 1.7-.7 3.2-.7s2 .7 3.3.7c1.3 0 2.1-1.1 2.9-2.2.9-1.3 1.2-2.6 1.3-2.6-.1 0-2.6-1-2.6-3.7ZM13.9 5.7c.7-.9 1.2-2.1 1-3.3-1 .1-2.3.7-3 1.6-.7.7-1.2 2-.9 3.1 1.1.1 2.2-.6 2.9-1.4Z"/></svg></span>;
}
export function MiniChart({positive=true,large=false,range='1W'}:{positive?:boolean;large?:boolean;range?:string}) {
  const paths:Record<string,string>={
    '1D':'M0 40 14 39 24 42 35 36 45 39 56 34 65 37 78 26 86 30 98 27 109 30 122 20 133 23 145 14 154 16 167 11 180 6',
    '1W':'M0 49 14 44 24 46 35 34 45 39 56 31 65 33 78 18 86 24 98 14 109 20 122 9 133 15 145 5 154 10 167 3 180 6',
    '1M':'M0 44 14 49 24 40 35 43 45 31 56 36 65 29 78 34 86 25 98 27 109 17 122 20 133 12 145 18 154 10 167 14 180 6',
    'All':'M0 51 14 49 24 41 35 46 45 31 56 42 65 36 78 30 86 35 98 22 109 29 122 18 133 24 145 11 154 17 167 9 180 6',
  };
  const d=positive?(paths[range]||paths['1W']):'M0 8 14 11 25 7 37 19 46 15 58 25 68 20 79 35 89 29 100 39 111 35 123 46 134 38 147 47 158 42 169 50 180 46';
  return <svg className={large?'large-chart':'mini-chart'} viewBox="0 0 180 55" preserveAspectRatio="none" aria-hidden="true"><path d={d} fill="none" stroke={positive?'#49a984':'#bc8591'} strokeWidth={large?1.5:1.8} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/></svg>;
}
