import LayerSwapApiClient from '../lib/layerSwapApiClient';
import Layout from '../components/layout';
import fs from 'fs';
import path from 'path';
import { LayerSwapSettings } from '../Models/LayerSwapSettings';
import { InferGetServerSidePropsType } from 'next';
import React from 'react';
import { AuthProvider } from '../context/authContext';
import { SwapDataProvider } from '../context/swap';
import { UserExchangeProvider } from '../context/userExchange';
import { MenuProvider } from '../context/menu';
import { SettingsProvider } from '../context/settings';
import SwapWithdrawal from '../components/SwapWithdrawal';
import LayerSwapAuthApiClient from '../lib/userAuthApiClient';

const SwapDetails = ({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  LayerSwapAuthApiClient.identityBaseEndpoint = settings.data.discovery.identity_url

  return (
    <Layout>
      <AuthProvider>
        <SettingsProvider data={settings}>
          <MenuProvider>
            <SwapDataProvider >
              <UserExchangeProvider>
                <SwapWithdrawal />
              </UserExchangeProvider>
            </SwapDataProvider >
          </MenuProvider>
        </SettingsProvider>
      </AuthProvider>
    </Layout>
  )
}

const CACHE_PATH = ".settings";

export const getServerSideProps = async (ctx) => {
  const params = ctx.params;
  let isValidGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.swapId);
  if (!isValidGuid) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      }
    }
  }

  let settings: LayerSwapSettings;
  try {
    settings = JSON.parse(
      fs.readFileSync(path.join(__dirname, CACHE_PATH), 'utf8')
    )
  } catch (error) {
    console.log('Cache not initialized')
  }

  if (!settings) {
    var apiClient = new LayerSwapApiClient();
    const data = await apiClient.fetchSettingsAsync()

    const resource_storage_url = data.data.discovery.resource_storage_url
    if (resource_storage_url[resource_storage_url.length - 1] === "/")
      data.data.discovery.resource_storage_url = resource_storage_url.slice(0, -1)

    try {
      fs.writeFileSync(
        path.join(__dirname, CACHE_PATH),
        JSON.stringify(data),
        'utf8'
      )
      console.log('Wrote to settings cache')
    } catch (error) {
      console.log('ERROR WRITING SETTINGS CACHE TO FILE')
      console.log(error)
    }
    settings = data
  }

  return {
    props: {
      settings
    }
  }
}

export default SwapDetails