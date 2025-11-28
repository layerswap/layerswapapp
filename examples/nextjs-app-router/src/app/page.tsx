import '@layerswap/widget/index.css';
import { getSettings, WidgetLoading } from '@layerswap/widget';
import { LayerswapWidget } from '../components/LayerswapWidget';

export default async function Page() {
  const settings = await getSettings(process.env.NEXT_PUBLIC_API_KEY!);

  if (!settings) return <WidgetLoading />

  return <LayerswapWidget settings={settings} />;
}