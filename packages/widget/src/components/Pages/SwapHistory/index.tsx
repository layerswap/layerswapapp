'use client'
import Content from "./History"
import Header from "./Header";
import { SwapDataProvider } from "@/context/swap";
import { FC } from "react";
import { useBackClickCallback } from "@/context/callbackProvider";

export const TransactionsHistory: FC = () => {
  const triggerOnBackClickCallback = useBackClickCallback()
  return (
    <SwapDataProvider >
      <div id="widget" className='bg-secondary-700 sm:relative rounded-2xl! w-full text-primary-text overflow-y-auto sm:overflow-hidden max-h-screen h-full sm:h-[650px]'>
        <div className="overflow-y-auto flex flex-col h-full z-40 pb-4">
          <Header onBackClick={triggerOnBackClickCallback} />
          <div className="px-4 h-full overflow-y-auto styled-scroll max-h-[80vh]" id='virtualListContainer'>
            <Content />
          </div>
        </div>
        <div id="widget_root" />
      </div>
    </SwapDataProvider >
  )
}