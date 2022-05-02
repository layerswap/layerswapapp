import React, { useRef, useState } from 'react';
import { Formik, Form, Field, FormikErrors, useFormikContext, FormikProps } from 'formik';
import { FC } from 'react'
import axios from 'axios';
import { useRouter } from 'next/router'
import { CryptoNetwork } from '../Models/CryptoNetwork';
import LayerSwapApiClient from '../lib/layerSwapApiClient';
import CardContainer from './cardContainer';
import InsetSelectMenu from './selectMenu/insetSelectMenu';
import { isValidAddress } from '../lib/etherAddressValidator';
import { LayerSwapSettings } from '../Models/LayerSwapSettings';
import { Currency } from '../Models/Currency';
import { Exchange } from '../Models/Exchange';
import { SelectMenuItem } from './selectMenu/selectMenuItem';
import SelectMenu from './selectMenu/selectMenu';
import IntroCard from './introCard';
import Image from 'next/image'
import OffRampDetailsModal from './offRampDetailsModal';
import { SwapInfo } from '../Models/SwapInfo';
import { isValidEmailAddress } from '../lib/emailAddressValidator';
import ConfirmationModal from './confirmationModal';
import { SwapFormValues } from './DTOs/SwapFormValues';
import { ImmutableXClient } from '@imtbl/imx-sdk';
import ImmutableXConnectModal from './immutableXConnectModal';
import SwapButton from './buttons/swapButton';
import { Partner } from '../Models/Partner';
import { useSettingsState } from '../context/settings';
import MainStep from './Wizard/Steps/MainStep';
import { useWizardState, WizardProvider } from '../context/wizard';
import { SwapDataProvider } from '../context/swap';


interface SwapApiResponse {
  swap_id: string;
  redirect_url: string;
}

interface SwapProps {
  destNetwork?: string;
  destAddress?: string;
  lockAddress?: boolean;
  lockNetwork?: boolean;
  addressSource?: string;
  sourceExchangeName?: string;
  asset?: string;
  swapMode: string
}

interface ExchangesFieldProps {
  availableExchanges: SelectMenuItem<Exchange>[];
  label: string;
  isOfframp: boolean;
}


const Swap: FC<SwapProps> = ({ destNetwork, destAddress, lockNetwork, addressSource, sourceExchangeName, asset, swapMode }) => {
  const router = useRouter();
  let isOfframp = swapMode == "offramp";
  const formikRef = useRef<FormikProps<SwapFormValues>>(null);
  let formValues = formikRef.current?.values;

  const settings = useSettingsState();

  const availablePartners = Object.fromEntries(settings.partners.map(c => [c.name.toLowerCase(), new SelectMenuItem<Partner>(c, c.name, c.display_name, c.logo_url, c.is_enabled)]));

  let isPartnerAddress = addressSource && availablePartners[addressSource] && destAddress && !isOfframp;

  // Offramp modal stuff
  const [isOfframpModalOpen, setisOfframpModalOpen] = useState(false);
  const [offRampAddress, setoffRampAddress] = useState("");
  const [offRampMemo, setoffRampMemo] = useState("");
  const [offRampAmount, setoffRampAmount] = useState("");
  const [createdSwapId, setcreatedSwapId] = useState("");

  function onOffRampModalDismiss(isIntentional: boolean) {
    if (isIntentional || confirm("Are you sure you want to stop?")) {
      setisOfframpModalOpen(false);
    }
  }

  function onOffRampModalConfirm() {
    setisOfframpModalOpen(false);
    router.push(`/${createdSwapId}`);
  }

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isImmutableModalOpen, setIsImmutableModalOpen] = useState(false);

  function onConfirmModalDismiss(isIntentional: boolean) {
    if (isIntentional || confirm("Are you sure you want to stop?")) {
      setIsConfirmModalOpen(false);
      formikRef.current.setSubmitting(false);
    }
  }

  function onImmutableModalDismiss(isIntentional: boolean) {
    if (isIntentional || confirm("Are you sure you want to stop?")) {
      setIsImmutableModalOpen(false);
      formikRef.current.setSubmitting(false);
    }
  }

  function onConfrmModalConfirm() {
    setIsConfirmModalOpen(false);

    axios.post<SwapApiResponse>(
      LayerSwapApiClient.apiBaseEndpoint + "/swaps",
      {
        amount: Number(formValues.amount?.toString()?.replace(",", ".")),
        currency: formValues.currency.name,
        destination_address: formValues.destination_address,
        network: formValues.network.id,
        exchange: formValues.exchange.id,
        to_exchange: isOfframp,
        partner_name: isPartnerAddress ? availablePartners[addressSource].id : undefined
      }
    )
      .then(response => {
        if (isOfframp) {
          axios.get<SwapInfo>(LayerSwapApiClient.apiBaseEndpoint + `/swaps/${response.data.swap_id}`)
            .then(r => {
              setoffRampAddress(r.data.offramp_info.deposit_address);
              setoffRampMemo(r.data.offramp_info.memo);
              setoffRampAmount(r.data.amount.toLocaleString());
              setcreatedSwapId(r.data.id);

              setisOfframpModalOpen(true);
            });
        }
        else {
          router.push(response.data.redirect_url)
            .then(() => formikRef.current.setSubmitting(false));
        }

      }).catch(() => {
        formikRef.current.setSubmitting(false);
      });
  }

  function onImmutableModalConfirm(address: string) {
    formikRef.current.values.destination_address = address;
    setIsImmutableModalOpen(false);
    setIsConfirmModalOpen(true);
  }

  return (
    <div>
      <OffRampDetailsModal address={offRampAddress} memo={offRampMemo} amount={offRampAmount} isOpen={isOfframpModalOpen} onConfirm={onOffRampModalConfirm} onDismiss={onOffRampModalDismiss} />
      <ConfirmationModal formValues={formikRef.current?.values} onConfirm={onConfrmModalConfirm} onDismiss={onConfirmModalDismiss} isOpen={isConfirmModalOpen} isOfframp={isOfframp} />
      <ImmutableXConnectModal onConfirm={onImmutableModalConfirm} onDismiss={onImmutableModalDismiss} isOpen={isImmutableModalOpen} destination_address={formikRef.current?.values?.destination_address} />
      <div className="flex flex-col space-y-6 text-white">
        <SwapDataProvider >
          <WizardProvider >
          </WizardProvider >
        </SwapDataProvider >

        <IntroCard />
      </div >
    </div >
  )
};




export default Swap;