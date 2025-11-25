'use client'
import Content from "./History"
import { SwapDataProvider } from "@/context/swap";
import { FC } from "react";
import { useCallbacks } from "@/context/callbackProvider";
import { Widget } from "@/components/Widget/Index";

export const TransactionsHistory: FC = () => {
  const { onBackClick } = useCallbacks()
  return (
    <SwapDataProvider >
      <Widget goBack={onBackClick}>
        <Widget.Content>
          <div className="px-6 h-full overflow-y-auto styled-scroll max-h-[80vh]" id='virtualListContainer'>
            <Content />
          </div>
        </Widget.Content>
      </Widget>
    </SwapDataProvider >
  )
}