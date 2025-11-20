'use client'
import Content from "./History"
import { SwapDataProvider } from "@/context/swap";
import { FC } from "react";
import { useBackClickCallback } from "@/context/callbackProvider";
import { Widget } from "@/components/Widget/Index";

export const TransactionsHistory: FC<{ height?: string }> = ({ height = '600px' }) => {
  const triggerOnBackClickCallback = useBackClickCallback()
  return (
    <SwapDataProvider >
      <Widget goBack={triggerOnBackClickCallback}>
        <Widget.Content>
          <div
            style={{ height }}
            className="h-full w-full overflow-y-auto styled-scroll"
            id='virtualListContainer'
          >
            <Content />
          </div>
        </Widget.Content>
      </Widget>
    </SwapDataProvider >
  )
}