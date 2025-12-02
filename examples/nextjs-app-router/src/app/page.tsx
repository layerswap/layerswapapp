import '@layerswap/widget/index.css';
import { getSettings } from '@layerswap/widget';
import { LayerswapWidget } from '../components/LayerswapWidget';

export default async function Page() {
  const settings = await getSettings(process.env.NEXT_PUBLIC_API_KEY!);

  return <LayerswapWidget settings={settings!} />;
}