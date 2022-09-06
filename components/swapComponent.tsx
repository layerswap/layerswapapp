import React from 'react';
import { FC } from 'react'
import { SwapDataProvider } from '../context/swap';
import { AuthProvider } from '../context/authContext';
import { UserExchangeProvider } from '../context/userExchange';
import Wizard from './Wizard/Wizard';
import { MenuProvider } from '../context/menu';
import IntroCard from './introCard';
import CreateSwap from './Wizard/CreateSwap';




const Swap: FC = () => {

  return (
    <div>
      <div className="text-white">
        <AuthProvider>
          <MenuProvider>
            <SwapDataProvider >
              <UserExchangeProvider>
                  <div></div>
              </UserExchangeProvider>
            </SwapDataProvider >
          </MenuProvider>
        </AuthProvider>
        <IntroCard />
      </div >
    </div >
  )
};

export default Swap;