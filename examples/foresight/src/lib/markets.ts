export type Category = 'All' | 'Politics' | 'Sports' | 'Crypto' | 'Pop culture' | 'Business' | 'Science';
export type Market = {
  id: string; title: string; category: Category; kind: string;
  chance: number; change: number; volume: string; volumeValue: number;
  comments: number; end: string; endsAt: string; fresh?: boolean;
  outcomes?: { label: string; chance: number }[];
  description: string;
};
export const markets: Market[] = [
  { id: 'bitcoin', title: 'Will Bitcoin hit $150,000 by the end of 2026?', category: 'Crypto', kind: 'bitcoin', chance: 64, change: 4.2, volume: '$2.4m', volumeValue: 2400000, comments: 128, end: 'Dec 31, 2026', endsAt:'2026-12-31', description: 'This demo market resolves Yes if the price of Bitcoin reaches $150,000 USD on or before December 31, 2026. Market data and prices are fictional.' },
  { id: 'election', title: 'Which party will win the 2026 US midterms?', category: 'Politics', kind: 'capitol', chance: 58, change: 1.8, volume: '$1.8m', volumeValue: 1800000, comments: 94, end: 'Nov 3, 2026', endsAt:'2026-11-03', outcomes:[{label:'Democrats',chance:58},{label:'Republicans',chance:42}], description:'This fictional market tracks which party wins control of the US House of Representatives in the November 2026 midterm elections. Use demo funds to explore either outcome.' },
  { id:'champions', title:'Who will win the 2026–27 Champions League?', category:'Sports',kind:'football',chance:28,change:2.1,volume:'$956k',volumeValue:956000,comments:76,end:'Jun 5, 2027',endsAt:'2027-06-05',outcomes:[{label:'Real Madrid',chance:28},{label:'Arsenal',chance:22}],description:'A fictional Champions League winner market for the 2026–27 season. The teams and odds shown are sample data, and demo trades do not create a real position.' },
  { id:'fed',title:'Will the Fed cut rates in December?',category:'Business',kind:'fed',chance:72,change:-2.4,volume:'$842k',volumeValue:842000,comments:53,end:'Dec 9, 2026',endsAt:'2026-12-09',description:'Resolves Yes if the Federal Reserve announces a reduction to its target federal funds rate at its December 2026 meeting. This is a fictional demo market.' },
  { id:'ethereum',title:'Ethereum above $5,000 before 2027?',category:'Crypto',kind:'ethereum',chance:46,change:3.6,volume:'$728k',volumeValue:728000,comments:61,end:'Dec 31, 2026',endsAt:'2026-12-31',description:'This sample market resolves Yes if ETH trades above $5,000 USD before January 1, 2027. All prices, volumes, and probabilities are illustrative.' },
  { id:'spacex',title:'Will SpaceX land on Mars before 2030?',category:'Science',kind:'rocket',chance:19,change:1.2,volume:'$614k',volumeValue:614000,comments:112,end:'Dec 31, 2029',endsAt:'2029-12-31',description:'This demo market resolves Yes if an uncrewed or crewed SpaceX vehicle successfully lands on the surface of Mars before January 1, 2030.' },
  { id:'album',title:'Will Taylor Swift announce a new album this year?',category:'Pop culture',kind:'music',chance:83,change:6.4,volume:'$482k',volumeValue:482000,comments:87,end:'Dec 31, 2026',endsAt:'2026-12-31',fresh:true,description:'A fictional entertainment market about whether Taylor Swift publicly announces a new studio album by the end of 2026. Sample probabilities do not represent live information.' },
  { id:'apple',title:'Will Apple release a foldable iPhone in 2027?',category:'Business',kind:'apple',chance:67,change:-1.5,volume:'$391k',volumeValue:391000,comments:42,end:'Dec 31, 2027',endsAt:'2027-12-31',fresh:true,description:'Resolves Yes if Apple releases a foldable iPhone for public purchase during 2027. This market and its trading activity are fictional.' },
];
export const categories: Category[] = ['All','Politics','Sports','Crypto','Pop culture','Business','Science'];
export type Position = {id:string; marketId:string; outcome:string; amount:number; shares:number; price:number; createdAt:string};
export type DemoState = { balance: number; positions: Position[]; bookmarks: string[] };
export const defaultDemo: DemoState = { balance: 1000, positions: [], bookmarks: [] };
