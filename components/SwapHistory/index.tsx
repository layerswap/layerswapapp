import Content from "./History"
import Header from "./Header";

function TransactionsHistory() {

  return (
    <div id="widget" className='bg-secondary-700 sm:shadow-card sm:relative rounded-3xl w-full text-primary-text overflow-y-auto sm:overflow-hidden max-h-screen h-full sm:h-[650px]'>
      <div className="overflow-y-auto flex flex-col h-full z-40 pb-4">
        <Header />
        <div className="px-4 overflow-y-auto styled-scroll h-[90svh] sm:h-full" id='virtualListContainer'>
          <Content />
        </div>
      </div>
      <div id="widget_root" />
    </div>
  )
}

export default TransactionsHistory;