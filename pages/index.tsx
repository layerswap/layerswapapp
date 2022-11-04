import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { SettingsProvider } from '../context/settings'
import { LayerSwapSettings } from '../Models/LayerSwapSettings'
import { QueryParams } from '../Models/QueryParams'
import MaintananceContent from '../components/maintanance/maintanance'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { enc, HmacSHA256 } from 'crypto-js';

type IndexProps = {
  settings?: LayerSwapSettings,
  inMaintanance: boolean,
  validSignatureisPresent?: boolean,
}

export default function Home({ settings, inMaintanance }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
  return (
    <Layout>
      {
        inMaintanance
          ?
          <MaintananceContent />
          :
          <SettingsProvider data={settings}>
            <Swap />
          </SettingsProvider>
      }
    </Layout>
  )
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

  var apiClient = new LayerSwapApiClient();
  const { data: settings } = await apiClient.GetSettingsAsync()

  settings.networks = settings.networks.filter((element) => element.status !== "inactive")
  settings.exchanges = settings.exchanges.filter((element) => element.status !== "inactive");

  const resource_storage_url = settings.discovery.resource_storage_url
  if (resource_storage_url[resource_storage_url.length - 1] === "/")
    settings.discovery.resource_storage_url = resource_storage_url.slice(0, -1)

  result.settings = settings;
  result.settings.validSignatureisPresent = validSignatureIsPresent;
  if (!result.settings.networks.some(x => x.status === "active")) {
    result.inMaintanance = true;
  }

  return {
    props: result,
  }
}

function validateSignature(queryParams: QueryParams): boolean {
  //One day
  const PERIOD_IN_MILISECONDS = 86400000
  if (!queryParams.timestamp || !queryParams.signature || Number(queryParams.timestamp) < new Date().getTime() - PERIOD_IN_MILISECONDS)
    return false

  const secret = JSON.parse(process.env.PARTNER_SECRETS || "{}")?.[queryParams.addressSource]?.[queryParams.apiKey]
  if (!secret)
    return false;
  const paraps: QueryParams = { ...queryParams }
  const parnerSignature = paraps.signature
  delete paraps.signature;
  let dataToSign = formatParams(paraps);
  let signature = hmac(dataToSign, secret);
  return signature === parnerSignature
}

const formatParams = (queryParams) => {
  // Sort params by key
  let sortedValues = Object.entries(queryParams).sort(([a], [b]) => a > b ? 1 : -1);

  // Lowercase all the keys and join key and value "key1=value1&key2=value2&..."
  return sortedValues.map(([key, value]) => `${key.toLowerCase()}=${value}`).join('&');
}
const hmac = (data, secret) => {
  // Compute the signature as a HEX encoded HMAC with SHA-256 and your Secret Key
  const token = enc.Hex.stringify(HmacSHA256(data.toString(enc.Utf8), secret));
  return token;
}