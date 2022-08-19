import LayerSwapApiClient from '../lib/layerSwapApiClient';
import Layout from '../components/layout';
import fs from 'fs';
import path from 'path';
import { LayerSwapSettings } from '../Models/LayerSwapSettings';
import { InferGetServerSidePropsType } from 'next';
import React from 'react';
import IntroCard from '../components/introCard';
import { AuthProvider } from '../context/authContext';
import { SwapDataProvider } from '../context/swap';
import { UserExchangeProvider } from '../context/userExchange';
import { FormWizardProvider } from '../context/formWizardProvider';
import Wizard from '../components/Wizard/Wizard';
import { SwapWizardSteps } from '../Models/Wizard';
import OverviewStep from '../components/Wizard/Steps/OverviewStep';
import WithdrawExchangeStep from '../components/Wizard/Steps/WithdrawExhangeStep';
import ProccessingStep from '../components/Wizard/Steps/ProccessingStep';
import SuccessfulStep from '../components/Wizard/Steps/SuccessfulStep';
import FailedStep from '../components/Wizard/Steps/FailedStep';
import EmailStep from '../components/Wizard/Steps/EmailStep';
import ExternalPaumentStep from '../components/Wizard/Steps/ExternalPaymentStep';
import { MenuProvider } from '../context/menu';
import { SettingsProvider } from '../context/settings';
import SwapCodeStep from '../components/Wizard/Steps/SwapCodeStep';
import WithdrawNetworkStep from '../components/Wizard/Steps/WithdrawNetworkStep';

const SwapWizard: SwapWizardSteps = {
  "Email": { title: "Email confirmation", content: EmailStep, navigationDisabled: true, dismissOnBack: true, positionPercent: 70 },
  "Code": { title: "Code", content: SwapCodeStep, navigationDisabled: true, dismissOnBack: true, positionPercent: 75 },
  "Overview": { title: "Payment overview", content: OverviewStep, navigationDisabled: true, positionPercent: 80 },
  "ExternalPayment": { title: "Withdrawal", content: ExternalPaumentStep, navigationDisabled: true, positionPercent: 90 },
  "Withdrawal": { title: "Withdrawal", content: WithdrawExchangeStep, positionPercent: 90, navigationDisabled: true },
  "OffRampWithdrawal": { title: "OffRampWithdrawal", content: WithdrawNetworkStep, positionPercent: 90, navigationDisabled: true },
  "Processing": { title: "", content: ProccessingStep, positionPercent: 95 },
  "Success": { title: "", content: SuccessfulStep, navigationDisabled: true, positionPercent: 100 },
  "Failed": { title: "", content: FailedStep, navigationDisabled: true, positionPercent: 100 },
}

const SwapDetails = ({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) => {

  return (
    <Layout>
      <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-2xl">
        <div>
          <div className="flex flex-col space-y-6 text-white animate-fade-in">
            <AuthProvider>
              <SettingsProvider data={settings}>
                <MenuProvider>
                  <SwapDataProvider >
                    <UserExchangeProvider>
                      <FormWizardProvider wizard={SwapWizard} initialStep={"Overview"} initialLoading={true}>
                        <Wizard />
                      </FormWizardProvider >
                    </UserExchangeProvider>
                  </SwapDataProvider >
                </MenuProvider>
              </SettingsProvider>
            </AuthProvider>
            <IntroCard/>
          </div >
        </div >
      </div >
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