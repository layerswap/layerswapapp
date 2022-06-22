import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { CryptoNetwork } from '../Models/CryptoNetwork'
import { useWeb3React } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';
import { InjectedConnector } from '@web3-react/injected-connector';
import { useEffect, useState } from 'react'
import NavRadio, { NavRadioOption } from '../components/navRadio'
import Banner from '../components/banner'
import { SettingsProvider } from '../context/settings'
import { QueryProvider } from '../context/query'
import { AccountProvider } from '../context/account'
import { AuthProvider } from '../context/auth'
import IntroCard from '../components/introCard'
import TransactionsHistory from '../components/swapHistoryComponent'
import Wizard from '../components/Wizard/Wizard'
import { FormWizardProvider } from '../context/formWizardProvider'
import { LoginWizardSteps } from '../Models/Wizard'
import EmailStep from '../components/Wizard/Steps/Login/EmailStep'
import CodeStep from '../components/Wizard/Steps/Login/CodeStep'
import { MenuProvider } from '../context/menu'

const loginWizard: LoginWizardSteps = {
  "Email": { title: "Email confirmation", content: EmailStep, navigationDisabled: true, positionPercent: 50 },
  "Code": { title: "Code", content: CodeStep, positionPercent: 75 },
}

export default function Transactions() {

  return (
    <Layout>
      <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-3xl">
        <div className="flex flex-col space-y-6 text-white">
          <AuthProvider>
            <MenuProvider>
              <FormWizardProvider wizard={loginWizard} initialStep={"Email"} initialLoading={true}>
                <Wizard />
              </FormWizardProvider >
            </MenuProvider>
          </AuthProvider>
          <IntroCard />
        </div>
      </div>
    </Layout>
  )
}
