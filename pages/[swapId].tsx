import { useRouter } from 'next/router'
import useSWR from 'swr';
import CardContainer from '../components/cardContainer';
import LayerSwapApiClient from '../lib/layerSwapApiClient';
import { SwapInfo, SwapOffRampInfo } from '../Models/SwapInfo';
import { SwapStatus } from '../Models/SwapStatus';
import { CheckIcon, XIcon } from '@heroicons/react/outline'
import Link from 'next/link'
import SpinIcon from '../components/icons/spinIcon';
import Layout from '../components/layout';
import { useRef, useState } from 'react';
import fs from 'fs';
import path from 'path';
import { LayerSwapSettings } from '../Models/LayerSwapSettings';
import { InferGetServerSidePropsType } from 'next';
import { AxiosError } from "axios";
import React from 'react';
import IntroCard from '../components/introCard';
import { AuthProvider } from '../context/auth';
import { SwapDataProvider } from '../context/swap';
import { UserExchangeProvider } from '../context/userExchange';
import { FormWizardProvider } from '../context/formWizardProvider';
import Wizard from '../components/Wizard/Wizard';
import { SwapWizardSteps } from '../Models/Wizard';
import OverviewStep from '../components/Wizard/Steps/OverviewStep';
import WithdrawExchangeStep from '../components/Wizard/Steps/WithdrawExhangeStep';
import ProccessingStep from '../components/Wizard/Steps/ProccessingStep';
import SuccessfulStep from '../components/Wizard/Steps/SuccessfulStep';
import FailedPage from '../components/Wizard/Steps/FailedPage';
import EmailStep from '../components/Wizard/Steps/EmailStep';
import SwapCodeStep from '../components/Wizard/Steps/SwapCodeStep';
import ExternalPaumentStep from '../components/Wizard/Steps/ExternalPaymentStep';

enum SwapPageStatus {
  Processing,
  Failed,
  Success,
  NotFound
}

const SwapWizard: SwapWizardSteps = {
  "Email": { title: "Email confirmation", content: EmailStep, navigationDisabled: true, dismissOnBack: true, positionPercent: 70 },
  "Code": { title: "Code", content: SwapCodeStep, navigationDisabled: true, dismissOnBack: true, positionPercent: 75 },
  "Overview": { title: "Payment overview", content: OverviewStep, navigationDisabled: true, positionPercent: 80 },
  "ExternalPayment": { title: "Withdrawal", content: ExternalPaumentStep, navigationDisabled: true, dismissOnBack: true, positionPercent: 90 },
  "Withdrawal": { title: "Withdrawal", content: WithdrawExchangeStep, positionPercent: 90, navigationDisabled: true, dismissOnBack: true, },
  "Processing": { title: "", content: ProccessingStep, positionPercent: 95 },
  "Success": { title: "", content: SuccessfulStep, navigationDisabled: true, positionPercent: 100 },
  "Failed": { title: "", content: FailedPage, navigationDisabled: true, positionPercent: 100 },
}


const SwapDetails = ({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) => {

  return (
    <Layout>
      <div>
        <div className="flex flex-col space-y-6 text-white">
          <AuthProvider>
            <SwapDataProvider >
              <UserExchangeProvider>
                <FormWizardProvider wizard={SwapWizard} initialStep={"Overview"} initialLoading={true}>
                  <Wizard />
                </FormWizardProvider >
              </UserExchangeProvider>
            </SwapDataProvider >
          </AuthProvider>
          <IntroCard />
        </div >
      </div >
    </Layout>
  )
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

function renderIndicator(swapPageStatus: SwapPageStatus) {
  let baseBackground = "mx-auto flex items-center justify-center h-16 w-16 md:h-20 md:w-20 rounded-full sm:mx-0 ";
  let baseIcon = "h-8 w-8 md:h-16 md:w-16 ";
  switch (swapPageStatus) {
    case SwapPageStatus.NotFound:
    case SwapPageStatus.Failed: {
      return <div className={baseBackground + 'bg-red-100'}>
        <XIcon className={baseIcon + "text-red-500"} />
      </div>;
    }
    default:
    case SwapPageStatus.Processing: {
      return <div className={baseBackground + 'bg-green-500'}>
        <SpinIcon className={baseIcon + "text-green-100 animate-spin"} />
      </div>;
    }
    case SwapPageStatus.Success: {
      return <div className={baseBackground + 'bg-green-500'}>
        <CheckIcon className={baseIcon + "text-green-100"} />
      </div>;
    }
  }
}

function renderHeading(swapPageStatus: SwapPageStatus, offRampInfo?: SwapOffRampInfo) {
  switch (swapPageStatus) {
    case SwapPageStatus.NotFound: {
      return "Swap not found.";
    }
    case SwapPageStatus.Failed: {
      return "Something went wrong.";
    }
    default:
    case SwapPageStatus.Processing: {
      if (offRampInfo) {
        return "Waiting..."
      }
      return "Processing...";
    }
    case SwapPageStatus.Success: {
      return "Swap successful";
    }
  }
}

function renderDescription(swapPageStatus: SwapPageStatus, offRampInfo?: SwapOffRampInfo) {
  switch (swapPageStatus) {
    case SwapPageStatus.NotFound: {
      return "Ooops looks like you landed on a wrong page. If you believe that's not the case plase contact us through our Discord";
    }
    case SwapPageStatus.Failed: {
      return "We are sorry but there was an issue with your swap. Please contact us through our Discord";
    }
    default:
    case SwapPageStatus.Processing: {
      if (offRampInfo) {
        return <span>We are waiting for a deposit on Address <span className='font-bold text-pink-300 text-xs md:text-sm'>{offRampInfo.deposit_address}</span> with Memo  <span className='font-bold text-pink-300 text-xs md:text-sm'>{offRampInfo.memo}</span>.</span>
      }
      else {
        return "We are submitting your transaction to the network.You'll see the transaction id when it's picked up by a miner.";
      }
    }
    case SwapPageStatus.Success: {
      if (offRampInfo) {
        return "Your swap successfully completed. You can see it in your exchange account, or go ahead swap more! "
      }
      return "Your swap successfully completed. You can view it in the explorer, or go ahead swap more!"
    }
  }
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
      settings,
    },
  }
}

export default SwapDetails