import '@layerswap/widget/index.css';
import { getSettings } from '@layerswap/widget';
import { LayerswapWidget } from '../components/LayerswapWidget';

export default async function Page() {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY
  const settings = apiKey ? await getSettings(apiKey) : undefined;

  return <LayerswapWidget settings={settings || undefined} />;
}