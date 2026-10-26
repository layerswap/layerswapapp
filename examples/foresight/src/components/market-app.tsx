'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown, CircleHelp, Clock3, Copy, Flame, Globe2, Info, LayoutGrid, ListFilter, LogOut, Mail, MessageCircle, Plus, Search, Settings2, ShieldCheck, Sparkles, TrendingUp, Wallet, X } from 'lucide-react';
import WalletProvider from './auth/wallet-provider';
import { useWalletSession } from './auth/context';
import Dialog from './dialog';
import { BrandMark, DepositArtwork, LayerswapMark, MarketArt, MiniChart } from './artwork';
import { categories, defaultDemo, markets, type Category, type DemoState, type Market, type Position } from '@/lib/markets';
import type { DepositMethod, DepositRequest } from './deposit-widget';

const DepositWidget = dynamic(()=>import('./deposit-widget'),{ssr:false,loading:()=>null});
const storageKey='foresight-demo-v1';
const money=(v:number)=>v.toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});
const shortAddress=(a:string)=>`${a.slice(0,6)}…${a.slice(-4)}`;
type Modal = 'auth'|'how'|'setup'|'account'|null;
type View = 'markets'|'portfolio'|'watchlist';
type Sort = 'trending'|'new'|'ending';

function MarketCard({market,saved,onSave,onTrade,onOpen}:{market:Market;saved:boolean;onSave:()=>void;onTrade:(outcome:string,chance:number)=>void;onOpen:()=>void}) {
  return <article className="market-card">
    <div className="card-top"><MarketArt kind={market.kind}/><span className="market-category">{market.category}</span><button className={`icon-button bookmark-button ${saved?'saved':''}`} onClick={onSave} aria-label={`${saved?'Remove from':'Add to'} watchlist: ${market.title}`}><Bookmark size={17} fill={saved?'currentColor':'none'}/></button></div>
    <button className="market-title" onClick={onOpen}>{market.title}</button>
    {market.outcomes?<div className="multi-outcomes">{market.outcomes.map(o=><button className="outcome-row" key={o.label} onClick={()=>onTrade(o.label,o.chance)}><span><span className={`team-dot ${o.label==='Republicans'?'red':o.label==='Real Madrid'?'gold':o.label==='Arsenal'?'red':'blue'}`}/>{o.label}</span><strong>{o.chance}% <ArrowUpRight size={12}/></strong></button>)}</div>:
      <div className="chance-row"><div><strong>{market.chance}<span>%</span></strong><span className={`market-change ${market.change<0?'negative':''}`}>{market.change>0?'↗':'↘'} {Math.abs(market.change)}%</span></div><MiniChart positive={market.change>0}/></div>}
    {market.outcomes?<button className="more-outcomes" onClick={onOpen}>View market <ArrowRight size={13}/></button>:<div className="binary-buttons"><button className="yes-button" onClick={()=>onTrade('Yes',market.chance)}>Yes <span>{market.chance}¢</span><ArrowUpRight size={14}/></button><button className="no-button" onClick={()=>onTrade('No',100-market.chance)}>No <span>{100-market.chance}¢</span><ArrowUpRight size={14}/></button></div>}
    <div className="card-footer"><span><span className="volume-icon">▥</span>{market.volume} vol.</span><span><MessageCircle size={13}/>{market.comments}</span><span className="market-end"><Clock3 size={12}/>{market.end.split(',')[0]}</span></div>
  </article>;
}

function App() {
  const session=useWalletSession();
  const [view,setView]=useState<View>('markets');
  const [category,setCategory]=useState<Category>('All');
  const [sort,setSort]=useState<Sort>('trending');
  const [query,setQuery]=useState('');
  const [modal,setModal]=useState<Modal>(null);
  const [demo,setDemo]=useState<DemoState>(defaultDemo);
  const [hydrated,setHydrated]=useState(false);
  const [toast,setToast]=useState('');
  const [authError,setAuthError]=useState('');
  const [connecting,setConnecting]=useState(false);
  const [depositRequest,setDepositRequest]=useState<DepositRequest|null>(null);
  const [trade,setTrade]=useState<{market:Market;outcome:string;chance:number}|null>(null);
  const [amount,setAmount]=useState('25');
  const [tradeError,setTradeError]=useState('');
  const [tradeSuccess,setTradeSuccess]=useState(false);
  const [portfolioTab,setPortfolioTab]=useState<'positions'|'activity'>('positions');
  const [chartRange,setChartRange]=useState('1W');
  const [showFilter,setShowFilter]=useState(false);
  const [highProbability,setHighProbability]=useState(false);
  const [mobileSearch,setMobileSearch]=useState(false);
  const searchInput=useRef<HTMLInputElement>(null);
  const pendingDeposit=useRef<DepositMethod|null|undefined>(undefined);
  useEffect(()=>{
    // Fetch the small host bundle while browsing; the widget itself warms as
    // soon as a real destination wallet is available.
    if(process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY)void import('./deposit-widget').catch(()=>{});
  },[]);
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement;
      if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(target.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();setMobileSearch(true);searchInput.current?.focus();}
      if(event.key==='Escape')setMobileSearch(false);
    };
    document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);
  },[]);
  useEffect(()=>{if(mobileSearch)searchInput.current?.focus();},[mobileSearch]);
  useEffect(()=>{
    try {const stored=localStorage.getItem(storageKey);if(stored){const parsed=JSON.parse(stored);if(Number.isFinite(parsed.balance)&&parsed.balance>=0&&Array.isArray(parsed.positions)&&Array.isArray(parsed.bookmarks))setDemo(parsed);}} catch { /* A blocked or unavailable store does not prevent exploring. */ }
    setHydrated(true);
  },[]);
  useEffect(()=>{if(hydrated){try{localStorage.setItem(storageKey,JSON.stringify(demo));}catch{}}},[demo,hydrated]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4200);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{if(session.authenticated&&modal==='auth'){setModal(null);setAuthError('');}},[session.authenticated,modal]);
  useEffect(()=>{
    if(session.ready&&session.address&&pendingDeposit.current!==undefined){
      const method=pendingDeposit.current;
      pendingDeposit.current=undefined;
      setModal(null);
      setAuthError('');
      setDepositRequest(previous=>({id:(previous?.id||0)+1,method,address:session.address!}));
    }
  },[session.address,session.ready]);
  const notify=useCallback((message:string)=>setToast(message),[]);
  useEffect(()=>{
    if(session.connectionError && pendingDeposit.current!==undefined){
      pendingDeposit.current=undefined;
      notify(session.connectionError);
    }
  },[session.connectionError,notify]);
  const navigate=(next:View)=>{setView(next);setQuery('');setCategory('All');};
  const openDeposit=(method:DepositMethod|null=null)=>{
    if(!process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY){
      notify('Add your Layerswap API key in Integration setup to enable deposits.');
      return;
    }
    if(session.connectionError){notify(session.connectionError);return;}
    if(!session.address || !session.ready){
      pendingDeposit.current=method;
      setAuthError('');
      if(session.authenticated)notify('Preparing your wallet connection…');
      else setModal('auth');
      return;
    }
    setDepositRequest(previous=>({id:(previous?.id||0)+1,method,address:session.address!}));
  };
  const connect=async(kind:'wallet'|'privy')=>{
    setAuthError('');setConnecting(true);
    const previousModal=modal;
    const usesSdk=kind==='wallet'?session.reownConfigured:session.privyConfigured;
    if(usesSdk){
      // Native dialogs make the rest of the document inert. Release the top
      // layer before Reown or Privy mounts its own accessible login modal.
      document.querySelector<HTMLDialogElement>('dialog[open]')?.close();
      setModal(null);
    }
    try{if(kind==='wallet')await session.connectWallet();else await session.login();}
    catch(error){pendingDeposit.current=undefined;if(usesSdk)setModal(previousModal);setAuthError(error instanceof Error?error.message:'Connection failed. Please try again.');}
    finally{setConnecting(false);}
  };
  const openTrade=(market:Market,outcome='Yes',chance=market.chance)=>{setTrade({market,outcome,chance});setAmount('25');setTradeError('');setTradeSuccess(false);};
  const toggleBookmark=(id:string)=>setDemo(d=>({...d,bookmarks:d.bookmarks.includes(id)?d.bookmarks.filter(i=>i!==id):[...d.bookmarks,id]}));
  const filtered=useMemo(()=>{
    const result=markets.filter(m=>(view!=='watchlist'||demo.bookmarks.includes(m.id))&&(category==='All'||m.category===category)&&(!highProbability||m.chance>=50)&&(!query||`${m.title} ${m.category}`.toLowerCase().includes(query.toLowerCase())));
    if(sort==='ending')return result.sort((a,b)=>a.endsAt.localeCompare(b.endsAt));
    if(sort==='new')return result.sort((a,b)=>Number(Boolean(b.fresh))-Number(Boolean(a.fresh))||b.id.localeCompare(a.id));
    return result.sort((a,b)=>b.volumeValue-a.volumeValue);
  },[view,demo.bookmarks,category,query,sort,highProbability]);
  const invest=()=>{
    if(!trade)return;
    const value=Number(amount);
    if(!Number.isFinite(value)||value<1){setTradeError('Enter an amount of at least $1.');return;}
    if(value>demo.balance){setTradeError('This amount exceeds your available demo funds.');return;}
    const position:Position={id:crypto.randomUUID(),marketId:trade.market.id,outcome:trade.outcome,amount:value,shares:value/(trade.chance/100),price:trade.chance,createdAt:new Date().toISOString()};
    setDemo(d=>({...d,balance:Math.round((d.balance-value)*100)/100,positions:[position,...d.positions]}));
    setTradeSuccess(true);
  };
  const depositComplete=useCallback(()=>{notify('Deposit completed. Your real funds are in your connected wallet.');},[notify]);
  const invested=demo.positions.reduce((sum,p)=>sum+p.amount,0);
  const resetDemo=()=>{setDemo(d=>({...defaultDemo,bookmarks:d.bookmarks}));notify('Your demo portfolio has been reset to $1,000.');};
  const destinationNetwork=(process.env.NEXT_PUBLIC_DEPOSIT_NETWORK||'BASE_MAINNET').replace('_MAINNET','').replaceAll('_',' ');
  const depositAvailable=Boolean(process.env.NEXT_PUBLIC_LAYERSWAP_API_KEY);
  const accountLabel=session.address?shortAddress(session.address):session.email?.split('@')[0]||'My account';
  // Keep an opened deposit and its recipient alive across host logout/account
  // changes. The next explicit Deposit request selects the new recipient.
  const widgetAddress=depositRequest?.address ?? (session.ready?session.address:null);
  return <>
    <header className="site-header"><div className="topbar page-width">
      <button className="brand" onClick={()=>navigate('markets')} aria-label="Foresight home"><BrandMark/><span>foresight<span className="brand-period">.</span></span></button>
      <nav className="primary-nav" aria-label="Main navigation"><button className={view==='markets'?'active':''} onClick={()=>navigate('markets')}>Markets</button><button className={view==='portfolio'?'active':''} onClick={()=>navigate('portfolio')}>Portfolio</button></nav>
      <div className={`search-wrap ${mobileSearch?'mobile-search-open':''}`}><Search size={17}/><input ref={searchInput} aria-label="Search markets" placeholder="Search markets" value={query} onChange={e=>{setQuery(e.target.value);if(view==='portfolio')setView('markets');}}/>{query||mobileSearch?<button className="clear-search" aria-label="Clear search" onClick={()=>{setQuery('');setMobileSearch(false);}}><X size={14}/></button>:<kbd>/</kbd>}</div>
      <button className="mobile-search-button" aria-label="Open market search" onClick={()=>setMobileSearch(v=>!v)}><Search size={18}/></button>
      <div className="header-actions"><button className="deposit-header" onClick={()=>openDeposit()}><Plus size={17}/>Deposit</button>{session.authenticated?<button className="connect-button account-button" onClick={()=>setModal('account')}><span className="account-dot"/>{accountLabel}<ChevronDown size={14}/></button>:<button className="connect-button" onClick={()=>{setAuthError('');setModal('auth');}}><Wallet size={16}/><span>Connect wallet</span></button>}</div>
    </div></header>
    <div className="category-bar"><div className="category-inner page-width"><nav className="category-nav" aria-label="Market categories"><button className={category==='All'&&view!=='watchlist'?'selected':''} onClick={()=>{setCategory('All');setView('markets');}}><Flame size={16}/>Trending</button><span className="nav-divider"/>{categories.filter(c=>c!=='All').map(c=><button className={category===c?'selected':''} key={c} onClick={()=>{setCategory(c);setView('markets');}}>{c}</button>)}<button className="watchlist-nav" aria-label="Watchlist" onClick={()=>navigate('watchlist')}><Bookmark size={16}/><span>Watchlist</span></button></nav><button className="how-link" onClick={()=>setModal('how')}><CircleHelp size={15}/>How it works</button></div></div>
    <main className="page-width main-content">
      {view==='portfolio'?<>
        <div className="page-intro"><div><h1>Your conviction, in action.</h1><p>A little perspective on your demo portfolio.</p></div><span className="demo-badge"><span/>Demo portfolio</span></div>
        <div className="portfolio-summary"><div><p>Portfolio value</p><strong>{money(demo.balance+invested)}</strong><span>Demo funds</span></div><div><p>Available to trade</p><strong>{money(demo.balance)}</strong><button onClick={resetDemo}>Reset demo funds</button></div><div><p>In positions</p><strong>{money(invested)}</strong><span>{demo.positions.length} open position{demo.positions.length===1?'':'s'}</span></div><div className="portfolio-deposit"><Wallet size={27}/><p>Bring your wallet along.</p><button className="connect-button" onClick={()=>openDeposit()}>Add real funds <Plus size={16}/></button></div></div>
        <div className="market-toolbar"><div className="market-tabs"><button className={portfolioTab==='positions'?'active':''} onClick={()=>setPortfolioTab('positions')}>Positions <span>{demo.positions.length}</span></button><button className={portfolioTab==='activity'?'active':''} onClick={()=>setPortfolioTab('activity')}>Activity</button></div><span className="muted text-sm">All trading uses demo funds</span></div>
        {demo.positions.length?<div className="positions-table"><div className="position-table-header"><span>Market</span><span>Position</span><span>{portfolioTab==='positions'?'Shares':'Date'}</span><span>Amount</span></div>{demo.positions.map(p=>{const m=markets.find(m=>m.id===p.marketId);if(!m)return null;return <button className="position-row" key={p.id} onClick={()=>openTrade(m,p.outcome,p.price)}><span className="position-market"><MarketArt kind={m.kind}/><strong>{m.title}</strong></span><span><span className={`position-pill ${p.outcome==='No'?'negative':''}`}>{p.outcome}</span><small>{p.price}¢ each</small></span><span>{portfolioTab==='positions'?p.shares.toFixed(2):new Date(p.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span><strong>{money(p.amount)}</strong></button>;})}</div>:<div className="empty-state"><TrendingUp size={38}/><h2>Your next prediction starts here.</h2><p>Explore the markets and use your $1,000 demo balance to take a position.</p><button className="connect-button" onClick={()=>navigate('markets')}>Explore markets <ArrowRight size={16}/></button></div>}
      </>:<>
        <div className="page-intro"><div><h1>{view==='watchlist'?'Keep your eye on what’s next.':'A little conviction goes a long way.'}</h1><p>{view==='watchlist'?'Your saved markets, all in one place.':'Big events. Bold predictions. What do you see coming?'}</p></div><span className="demo-badge"><span/>Demo markets</span></div>
        {view==='markets'&&category==='All'&&!query?<div className="feature-grid">
          <section className="deposit-feature"><div className="deposit-feature-copy"><span className="feature-pill"><Sparkles size={12}/>Your balance, without boundaries</span><h2>From Polymarket.<br/>To your next big call.</h2><p>Bring your Polymarket balance to Foresight.<br/>One simple deposit, powered by Layerswap.</p><button className="feature-cta" onClick={()=>openDeposit('polymarket')}>Deposit from Polymarket <ArrowUpRight size={16}/></button><div className="powered-by"><LayerswapMark/><span>Powered by <strong>Layerswap</strong></span></div></div><DepositArtwork/></section>
          <section className="intro-feature"><span className="intro-graphic"><svg viewBox="0 0 160 140" fill="none"><path d="M10 120 35 95l20 10 30-45 20 12 35-52" stroke="#a999ec" strokeWidth="2"/><path d="m120 19 21 0 0 22" stroke="#a999ec" strokeWidth="2"/><circle cx="86" cy="61" r="23" fill="#7560ba"/><path d="m76 61 7 7 14-15" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="34" cy="95" r="4" fill="#b9a4f1"/></svg></span><span className="intro-kicker"><span/>A fresh perspective</span><h2>Good instincts?<br/>Put them to the test.</h2><p>Start with $1,000 in demo funds.<br/>See where your conviction takes you.</p><button onClick={()=>openTrade(markets[0])}>Make your first prediction <ArrowRight size={16}/></button></section>
        </div>:null}
        <section className="market-section" aria-label="Prediction markets">
          <div className="market-toolbar"><div className="market-tabs">{view==='watchlist'?<button className="active"><Bookmark size={17}/>Your watchlist <span>{filtered.length}</span></button>:<><button className={sort==='trending'?'active':''} onClick={()=>setSort('trending')}><TrendingUp size={17}/>Trending</button><button className={sort==='new'?'active':''} onClick={()=>setSort('new')}><Sparkles size={16}/>New</button><button className={sort==='ending'?'active':''} onClick={()=>setSort('ending')}><Clock3 size={16}/>Ending soon</button></>}</div><div className="toolbar-right"><span>{filtered.length} markets</span><button className={`filter-button ${showFilter||highProbability?'active':''}`} onClick={()=>setShowFilter(v=>!v)} aria-expanded={showFilter}><ListFilter size={15}/>Filters{highProbability?<span className="filter-dot"/>:null}</button><span className="toolbar-divider"/><LayoutGrid size={16} className="grid-icon"/></div></div>
          {showFilter?<div className="filter-panel"><label><input type="checkbox" checked={highProbability} onChange={e=>setHighProbability(e.target.checked)}/>Probability of 50% or higher</label><button onClick={()=>{setHighProbability(false);setQuery('');setCategory('All');}}>Clear filters</button></div>:null}
          {category!=='All'||query?<div className="filter-result"><span>{query?`Results for “${query}”`:category}</span><button onClick={()=>{setQuery('');setCategory('All');}}>Clear <X size={13}/></button></div>:null}
          {filtered.length?<div className="market-grid">{filtered.map(m=><MarketCard key={m.id} market={m} saved={demo.bookmarks.includes(m.id)} onSave={()=>toggleBookmark(m.id)} onOpen={()=>openTrade(m,m.outcomes?.[0].label||'Yes',m.outcomes?.[0].chance||m.chance)} onTrade={(outcome,chance)=>openTrade(m,outcome,chance)}/>)}</div>:<div className="empty-state">{view==='watchlist'?<Bookmark size={38}/>:<Search size={38}/>}<h2>{view==='watchlist'?'A little foresight for later.':'No markets found.'}</h2><p>{view==='watchlist'?'Tap the bookmark on any market to add it here.':'Try a different search or clear your filters.'}</p><button className="connect-button" onClick={()=>{navigate('markets');setHighProbability(false);}}>Explore all markets <ArrowRight size={16}/></button></div>}
        </section>
        {view==='markets'&&!query&&category==='All'?<div className="market-bottom"><span className="little-logo"><BrandMark/></span><p>You don’t need a crystal ball.<br/><strong>Just a point of view.</strong></p><button onClick={()=>setModal('how')}>Get to know Foresight <ArrowUpRight size={15}/></button></div>:null}
      </>}
      <footer className="site-footer"><div><span className="footer-wordmark">foresight.</span><span>A clearer view of what’s next.</span></div><div><span className="footer-demo"><Info size={13}/>Fictional markets. Real possibilities.</span><button aria-label="Integration setup" onClick={()=>setModal('setup')}><Settings2 size={15}/></button><a href="https://layerswap.io" target="_blank" rel="noreferrer">Built with <LayerswapMark/>Layerswap <ArrowUpRight size={12}/></a></div></footer>
    </main>
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation"><button className={view==='markets'?'active':''} onClick={()=>navigate('markets')}><LayoutGrid size={19}/><span>Markets</span></button><button className={view==='portfolio'?'active':''} onClick={()=>navigate('portfolio')}><TrendingUp size={20}/><span>Portfolio</span></button><button className={view==='watchlist'?'active':''} onClick={()=>navigate('watchlist')}><Bookmark size={19}/><span>Watchlist</span></button><button onClick={()=>openDeposit()}><ArrowDownLeft size={20}/><span>Deposit</span></button></nav>

    <Dialog open={modal==='auth'} onClose={()=>{pendingDeposit.current=undefined;setModal(null);}} title="Welcome to Foresight" className="auth-dialog"><div className="auth-brand"><BrandMark/></div><p className="dialog-subtitle">Your next big call starts here.<br/>Connect a wallet or log in to get started.</p><button className="auth-choice" disabled={connecting} onClick={()=>connect('wallet')}><span className="auth-choice-icon"><Wallet size={23}/></span><span><strong>Connect a wallet</strong><small>WalletConnect, MetaMask, Coinbase & more</small></span><ArrowRight size={18}/></button><div className="or-divider"><span>or continue with</span></div><button className="auth-choice" disabled={connecting} onClick={()=>connect('privy')}><span className="auth-choice-icon email-icon"><Mail size={22}/></span><span><strong>Email or social login</strong><small>A wallet is created for you with Privy</small></span><ArrowRight size={18}/></button>{authError?<div className="error-box" role="alert"><Info size={17}/><span>{authError}</span></div>:null}<p className="secure-note"><ShieldCheck size={14}/>You’re always in control of your wallet.</p><p className="auth-demo-note">Explore markets with demo funds. Connecting never requests a transaction.</p></Dialog>

    <Dialog open={modal==='how'} onClose={()=>setModal(null)} title="A little foresight. A lot of possibility." className="how-dialog"><p className="dialog-subtitle left">A prediction market turns a point of view into a position.</p><div className="how-step"><span><Globe2 size={23}/></span><div><h3>Find your edge</h3><p>Explore questions about the world, from crypto and politics to sport and culture.</p></div></div><div className="how-step"><span><TrendingUp size={23}/></span><div><h3>Take a position</h3><p>Buy Yes if you think it will happen, or No if you don’t. A 64¢ price represents a 64% probability.</p></div></div><div className="how-step"><span><Wallet size={23}/></span><div><h3>Try it with demo funds</h3><p>Start with $1,000 of play money. Demo shares illustrate a $1 payout for a winning outcome; this app has no real-money trading or settlement.</p></div></div><div className="notice"><Info size={18}/><span>All markets, odds, and volumes are fictional. Wallet login and configured Layerswap deposits use real services.</span></div><button className="primary-wide" onClick={()=>{setModal(null);navigate('markets');}}>Find your first market <ArrowRight size={17}/></button></Dialog>

    <Dialog open={modal==='setup'} onClose={()=>setModal(null)} title="Integration setup" className="setup-dialog"><p className="dialog-subtitle left">Add public credentials to <code>.env.local</code>, then restart the Next.js app.</p>{[
      {name:'Reown AppKit',key:'NEXT_PUBLIC_REOWN_PROJECT_ID',configured:session.reownConfigured,url:'https://dashboard.reown.com',detail:'Enable WalletConnect and allow your app origin.'},
      {name:'Privy',key:'NEXT_PUBLIC_PRIVY_APP_ID',configured:session.privyConfigured,url:'https://dashboard.privy.io',detail:'Enable email / Google and embedded Ethereum wallets.'},
      {name:'Layerswap',key:'NEXT_PUBLIC_LAYERSWAP_API_KEY',configured:depositAvailable,url:'https://docs.layerswap.io/widget/deposit-widget',detail:'Allow your app origin and enable the Polymarket integration for your key.'},
    ].map(integration=><div className="setup-row" key={integration.name}><div><strong>{integration.name}</strong><span className={`config-status ${integration.configured?'configured':''}`}>{integration.configured?'Configured':'Needs credentials'}</span></div><code>{integration.key}</code><p>{integration.detail}</p><a href={integration.url} target="_blank" rel="noreferrer">Open {integration.name} <ArrowUpRight size={13}/></a></div>)}<p className="secure-note"><ShieldCheck size={15}/>Use public app credentials only. Never add a wallet private key.</p><p className="setup-note">Default destination: {destinationNetwork} / {process.env.NEXT_PUBLIC_DEPOSIT_TOKEN||'USDC'}, at the connected user’s address. Polymarket availability depends on Layerswap account configuration and supported routes.</p></Dialog>

    <Dialog open={modal==='account'} onClose={()=>setModal(null)} title="Your account" className="account-dialog"><div className="account-avatar"><Wallet size={28}/></div><p className="account-address">{session.address?shortAddress(session.address):session.email}</p><p className="secure-note">Connected with {session.method==='privy'?'Privy':session.reownConfigured?'Reown AppKit':'your browser wallet'}</p>{session.address?<button className="auth-choice" onClick={async()=>{try{await navigator.clipboard.writeText(session.address!);notify('Wallet address copied.');}catch{notify('Clipboard unavailable. Your address is shown in account details.');}}}><Copy size={19}/><span>Copy wallet address</span><span className="muted">{shortAddress(session.address)}</span></button>:null}<button className="auth-choice" onClick={()=>{setModal(null);navigate('portfolio');}}><TrendingUp size={19}/><span>View demo portfolio</span><ArrowRight size={17}/></button><button className="auth-choice disconnect-choice" onClick={async()=>{await session.disconnect();setModal(null);notify('Wallet disconnected from Foresight.');}}><LogOut size={19}/><span>Disconnect</span></button></Dialog>

    <Dialog open={Boolean(trade)} onClose={()=>setTrade(null)} title={tradeSuccess?'Prediction placed':'Make your call'} className="trade-dialog">
      {trade?tradeSuccess?<div className="trade-success"><span className="success-icon"><Check size={32}/></span><h3>A little conviction looks good on you.</h3><p>You bought <strong>{(Number(amount)/(trade.chance/100)).toFixed(2)} {trade.outcome} shares</strong> in</p><h4>{trade.market.title}</h4><div className="success-summary"><span>Demo funds used<strong>{money(Number(amount))}</strong></span><span>Potential demo payout<strong>{money(Number(amount)/(trade.chance/100))}</strong></span></div><p className="secure-note">This is a simulated position. No wallet transaction was made.</p><button className="primary-wide" onClick={()=>{setTrade(null);navigate('portfolio');}}>View your portfolio <ArrowRight size={17}/></button><button className="secondary-wide" onClick={()=>setTrade(null)}>Keep exploring</button></div>:<>
        <div className="trade-market"><MarketArt kind={trade.market.kind}/><div><span>{trade.market.category}</span><h3>{trade.market.title}</h3></div></div><div className="trade-chart"><div><strong>{trade.market.chance}%</strong><span className={trade.market.change<0?'negative':''}>{trade.market.change>0?'↗':'↘'} {Math.abs(trade.market.change)}% <small>sample history</small></span></div><MiniChart positive={trade.market.change>0} large range={chartRange}/><div className="chart-ranges">{['1D','1W','1M','All'].map(r=><button key={r} className={chartRange===r?'active':''} onClick={()=>setChartRange(r)}>{r}</button>)}<span>{chartRange==='1D'?'24-hour':chartRange==='1W'?'7-day':chartRange==='1M'?'30-day':'Full'} demo view</span></div></div>
        <div className="trade-outcome-selector">{(trade.market.outcomes||[{label:'Yes',chance:trade.market.chance},{label:'No',chance:100-trade.market.chance}]).map(o=><button key={o.label} className={`${trade.outcome===o.label?'selected':''} ${o.label==='No'?'no-outcome':''}`} onClick={()=>{setTrade({...trade,outcome:o.label,chance:o.chance});setTradeError('');}}>{o.label}<span>{o.chance}¢</span></button>)}</div>
        <form onSubmit={e=>{e.preventDefault();invest();}}><label className="amount-label" htmlFor="trade-amount">Amount <span>Available: {money(demo.balance)} demo</span></label><div className="amount-input"><span>$</span><input id="trade-amount" type="number" min="1" max={demo.balance} step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);setTradeError('');}}/><span>Demo USD</span></div><div className="amount-presets">{[10,25,50,100].map(v=><button key={v} type="button" className={Number(amount)===v?'active':''} onClick={()=>setAmount(String(v))}>${v}</button>)}<button type="button" onClick={()=>setAmount(String(demo.balance))}>Max</button></div><div className="trade-estimate"><span>Potential payout <Info size={12}/></span><strong>{money(Math.max(0,Number(amount)||0)/(trade.chance/100))} <small>demo</small></strong></div>{tradeError?<p className="trade-error" role="alert">{tradeError}</p>:null}<button className="primary-wide" type="submit">Buy {trade.outcome} · {trade.chance}¢ <ArrowRight size={17}/></button><p className="secure-note"><ShieldCheck size={13}/>Demo funds only. No real-money trading.</p></form>
        <details className="market-rules"><summary>Market rules <ChevronDown size={15}/></summary><p>{trade.market.description}</p></details>
      </>:null}
    </Dialog>
    {depositAvailable&&widgetAddress?<DepositWidget address={widgetAddress} request={depositRequest} wagmiConfig={session.wagmiConfig} onComplete={depositComplete} onStatus={notify}/>:null}
    {toast?<div className="toast" role="status"><Check size={17}/><span>{toast}</span><button aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={15}/></button></div>:null}
  </>;
}

export default function MarketApp(){return <WalletProvider><App/></WalletProvider>;}
