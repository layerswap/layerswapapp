import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { LayerSwapSettings } from '../Models/LayerSwapSettings'
import MaintananceContent from '../components/maintanance/maintanance'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { validateSignature } from '../helpers/validateSignature'
import { mapNetworkCurrencies } from '../helpers/settingsHelper'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings'
import { THEME_COLORS, ThemeData } from '../Models/Theme'
import ColorSchema from '../components/ColorSchema'
const { parseColor } = require("tailwindcss/lib/util/color");

type IndexProps = {
  settings?: LayerSwapSettings,
  themeData?: ThemeData,
  inMaintanance: boolean,
  validSignatureisPresent?: boolean,
}
const toRGB = (value) => parseColor(value).color.join(" ");

export default function Home({ settings, inMaintanance, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
  let appSettings = new LayerSwapAppSettings(settings)

  return (<>
    <Layout settings={appSettings}>
      {
        inMaintanance
          ?
          <MaintananceContent />
          :
          <Swap />
      }
    </Layout>
    <ColorSchema themeData={themeData} />
  </>)
}

export async function getServerSideProps(context) {

  const validSignatureIsPresent = validateSignature(context.query)

  let result: IndexProps = {
    inMaintanance: false,
  };

  context.res.setHeader(
    'Cache-Control',
    's-maxage=60, stale-while-revalidate'
  );
  try {
    const theme_name = context.query.theme || context.query.addressSource
    // const internalApiClient = new InternalApiClient()
    // const themeData = await internalApiClient.GetThemeData(theme_name);
    // result.themeData = themeData as ThemeData;
    const themeDat = THEME_COLORS[theme_name];
    if (themeDat)
      result.themeData = themeDat
  }
  catch (e) {
    console.log(e)
  }

  var apiClient = new LayerSwapApiClient();
  const { data: settings } = await apiClient.GetSettingsAsync()
  settings.networks = settings.networks //.filter(n => n.status !== "inactive");
  // settings.exchanges = mapNetworkCurrencies(settings.exchanges.filter(e => e.status === 'active'), settings.networks)
  settings.exchanges = mapNetworkCurrencies(settings.exchanges, settings.networks)

  const resource_storage_url = settings.discovery.resource_storage_url
  if (resource_storage_url[resource_storage_url.length - 1] === "/")
    settings.discovery.resource_storage_url = resource_storage_url.slice(0, -1)

  result.settings = settings;
  result.settings.validSignatureisPresent = validSignatureIsPresent;
  if (!result.settings.networks.some(x => x.status === "active") || process.env.IN_MAINTANANCE == 'true') {
    result.inMaintanance = true;
  }
  return {
    props: result,
  }
}

const RGBToHSL = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const l = Math.max(r, g, b);
  const s = l - Math.min(r, g, b);
  const h = s
    ? l === r
      ? (g - b) / s
      : l === g
        ? 2 + (b - r) / s
        : 4 + (r - g) / s
    : 0;
  return [
    60 * h < 0 ? 60 * h + 360 : 60 * h,
    100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
    (100 * (2 * l - s)) / 2,
  ];
};