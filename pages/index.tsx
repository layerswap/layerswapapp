import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { SettingsProvider } from '../context/settings'
import { LayerSwapSettings } from '../Models/LayerSwapSettings'
import MaintananceContent from '../components/maintanance/maintanance'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { validateSignature } from '../helpers/validateSignature'
import { mapNetworkCurrencies } from '../helpers/settingsHelper'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings'
import { useTheme } from 'next-themes'
import InternalApiClient from '../lib/internalApiClient'
import { useEffect } from 'react'
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
  console.log("themeData", themeData)
  return (
    <Layout>
      {
        inMaintanance
          ?
          <MaintananceContent />
          :
          <SettingsProvider data={appSettings}>
            <Swap />
          </SettingsProvider>
      }
      {themeData &&
        <style global jsx>{`
        :root {
          --ls-colors-backdrop:${themeData.backdrop};
          --ls-colors-placeholderText: ${themeData.backdrop};
          --ls-colors-actionButtonText: ${themeData.actionButtonText};
          --ls-colors-logo: ${themeData.logo};
          --ls-colors-primary: ${themeData.primary?.DEFAULT};
          --ls-colors-primary-50: ${themeData.primary?.[50]};
          --ls-colors-primary-100: ${themeData.primary?.[100]};
          --ls-colors-primary-200: ${themeData.primary?.[200]};
          --ls-colors-primary-300: ${themeData.primary?.[300]};
          --ls-colors-primary-400: ${themeData.primary?.[400]};
          --ls-colors-primary-500: ${themeData.primary?.[500]};
          --ls-colors-primary-600: ${themeData.primary?.[600]};
          --ls-colors-primary-700: ${themeData.primary?.[700]};
          --ls-colors-primary-800: ${themeData.primary?.[800]};
          --ls-colors-primary-900: ${themeData.primary?.[900]};

          --ls-colors-text-placeholder: ${themeData.primary?.textPlaceholder};
          --ls-colors-primary-text: ${themeData.primary?.text};
          --ls-colors-primary-button-text: ${themeData.primary?.buttonTextColor};
          --ls-colors-primary-logoColor: ${themeData.primary?.logoColor};

          --ls-colors-secondary: ${themeData.secondary?.DEFAULT};
          --ls-colors-secondary-50: ${themeData.secondary?.[50]};
          --ls-colors-secondary-100: ${themeData.secondary?.[100]};
          --ls-colors-secondary-200: ${themeData.secondary?.[200]};
          --ls-colors-secondary-300: ${themeData.secondary?.[300]};
          --ls-colors-secondary-400: ${themeData.secondary?.[400]};
          --ls-colors-secondary-500: ${themeData.secondary?.[500]};
          --ls-colors-secondary-600: ${themeData.secondary?.[600]};
          --ls-colors-secondary-700: ${themeData.secondary?.[700]};
          --ls-colors-secondary-800: ${themeData.secondary?.[800]};
          --ls-colors-secondary-900: ${themeData.secondary?.[900]};
          --ls-colors-secondary-950: ${themeData.secondary?.[950]};
        }
      `}</style>
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
  try {
    const theme_name = context.query.theme || context.query.addressSource
    // const internalApiClient = new InternalApiClient()
    // const themeData = await internalApiClient.GetThemeData(theme_name);
    // result.themeData = themeData as ThemeData;
    const themeDat = themes[theme_name];
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

type ThemeData = {
  backdrop: string,
  actionButtonText: string,
  logo: string,
  primary: {
    text: string,
    buttonTextColor: string,
    textPlaceholder: string,
    logoColor: string,
  } & ThemeColor,
  secondary: ThemeColor
}

type ThemeColor = {
  DEFAULT: string;
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}
const themes = {
  "imxMarketplace": {
    backdrop: "#007985",
    actionButtonText: '#000000',
    logo: '#ffffffff',
    primary: {
      'text': '#D1FBFF',
      DEFAULT: '#2EECFF',
      '50': '#E6FDFF',
      '100': '#D1FBFF',
      '200': '#A8F7FF',
      '300': '#80F3FF',
      '400': '#57F0FF',
      '500': '#2EECFF',
      '600': '#00E8FF',
      '700': '#00ACBD',
      '800': '#007985',
      '900': '#00464D',
    },
    secondary: {
      DEFAULT: '#111D36',
      '50': '#313C9B',
      '100': '#2E3B93',
      '200': '#232A70',
      '300': '#202965',
      '400': '#1C2759',
      '500': '#162546',
      '600': '#14213E',
      '700': '#111D36',
      '800': '#0F192F',
      '900': '#0C1527',
      '950': '#0B1123',
    },
  },
  "ea7df14a1597407f9f755f05e25bab42": {
    backdrop: "#007985",
    placeholderText: '#C6F2F6',
    actionButtonText: '#000000',
    logo: '#ffffffff',
    primary: {
      DEFAULT: '#80E2EB',
      '50': '#FFFFFF',
      '100': '#FFFFFF',
      '200': '#EAFAFC',
      '300': '#C6F2F6',
      '400': '#A3EAF1',
      '500': '#80E2EB',
      '600': '#50D7E3',
      '700': '#22C9D9',
      '800': '#1A9CA8',
      '900': '#136F78',
      '950': '#0F5960',
      'text': '#D1FBFF',
    },
    secondary: {
      DEFAULT: '#2E5970',
      '50': '#C1D9E6',
      '100': '#B3D0E0',
      '200': '#96BFD4',
      '300': '#79ADC8',
      '400': '#5C9BBC',
      '500': '#224253',
      '600': '#0F1D27',
      '700': '#0F1D27',
      '800': '#224253',
      '900': '#162B36',
      '950': '#0E1B22',
    },
  },
  "light": {
    backdrop: "#007985",
    placeholderText: '#C6F2F6',
    actionButtonText: '#000000',
    logo: '#ffffffff',
    primary: {
      DEFAULT: '#E42575',
      '50': '#F8C8DC',
      '100': '#F6B6D1',
      '200': '#F192BA',
      '300': '#ED6EA3',
      '400': '#E8498C',
      '500': '#E42575',
      '600': '#A6335E',
      '700': '#881143',
      '800': '#930863',
      '900': '#c499af',
      'background': '#F6B6D1',
      'text': '#171717',
      'text-muted': '#56617B',
      'text-placeholder': '#737373',
      'buttonTextColor': '#ffffff',
      'logoColor': '#FF0093'
    },
    secondary: {
      DEFAULT: '#EFEFEF',
      '50': '#313C9B',
      '100': '#2E3B93',
      '200': '#232A70',
      '300': '#4b5563',
      '400': '#6b7280',
      '500': '#9ca3af',
      '600': '#d1d5db',
      '700': '#e5e7eb',
      '800': '#f3f4f6',
      '900': '#fff',
      '950': '#fff',
    },
  }
}