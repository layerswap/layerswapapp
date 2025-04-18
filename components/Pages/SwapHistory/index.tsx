import Content from "./History"
import Header from "./Header";
import AppWrapper, { AppPageProps } from "../../AppWrapper";
import { SwapDataProvider } from "../../../context/swap";
import { FC } from "react";

const TransactionsHistory: FC<AppPageProps> = ({ settings, themeData }) => {

  return (
    <AppWrapper settings={settings} themeData={themeData}>
      <SwapDataProvider >
        <div id="widget" className='bg-secondary-900 sm:shadow-card sm:relative rounded-lg w-full text-primary-text overflow-y-auto sm:overflow-hidden max-h-screen h-full sm:h-[650px]'>
          <div className="overflow-y-auto flex flex-col h-full z-40 pb-4">
            <Header />
            <div className="px-6 h-full overflow-y-auto styled-scroll max-h-[80vh]" id='virtualListContainer'>
              <Content />
            </div>
          </div>
          <div id="widget_root" />
        </div>
      </SwapDataProvider >
    </AppWrapper>
  )
}

export default TransactionsHistory;