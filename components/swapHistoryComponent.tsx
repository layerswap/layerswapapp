const plans = [
    {
      id: 1,
      from: 'Coinbase',
      to: 'Loopring',
      amount: 2154,
      fee: 12.38,
      date: '12.02.22',
      currency: '(LRC)',
      status: 'confirmed',
      transId: 111
    },
    {
      id: 2,
      from: 'Binance',
      to: 'Arbitrum',
      amount: 0.15,
      fee: 0.0028,
      date: '22.03.22',
      currency: '(ETH)',
      status: 'failed',
      transId: 555
    },
  ]

function statusIcon(status) {
  
  if (status === 'failed') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-4 h-4 lg:h-9 lg:w-9" viewBox="0 0 60 60" fill="none">
        <circle cx="30" cy="30" r="30" fill="#E43636"/>
        <path d="M20 41L40 20" stroke="white" stroke-width="3.15789" stroke-linecap="round"/>
        <path d="M20 20L40 41" stroke="white" stroke-width="3.15789" stroke-linecap="round"/>
      </svg>
    )
  } else if (status === 'confirmed') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 w-4 h-4 lg:h-9 lg:w-9" viewBox="0 0 60 60" fill="none">
        <circle cx="30" cy="30" r="30" fill="#55B585"/>
        <path d="M16.5781 29.245L25.7516 38.6843L42.6308 21.3159" stroke="white" stroke-width="3.15789" stroke-linecap="round"/>
      </svg>
    )
  }
}

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}
function Example() {
    return (
      <div className="px-4 sm:px-6 lg:px-8 drop-shadow-lg">
        <div className="-mx-4 mt-10 ring-1 ring-darkblue-100 sm:-mx-6 md:mx-0 md:rounded-lg bg-darkblue-600">
          <table className="min-w-full divide-y divide-darkblue-100">
            <thead>
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-500 sm:pl-6">
                  <div className="hidden lg:block">
                    From
                  </div>
                  <div className="block lg:hidden">
                    From - To / Date
                  </div>
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                >
                  To
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-500 "
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                >
                  Fee
                </th>
                <th 
                  scope="col"
                  className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                    >
                  TX Id
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                >
                  Status
                </th>

                <th 
                  scope="col"
                  className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                    >
                  Date
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">More</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan, planIdx) => (
                <tr key={plan.id}>
                  <td
                    className={classNames(
                      planIdx === 0 ? '' : 'border-t border-transparent',
                      'relative py-4 pl-4 sm:pl-6 pr-3 text-sm'
                    )}
                  >
                    <div className="text-white hidden lg:block">
                      {plan.from}
                    </div>
                    <div className="mt-1 flex flex-col text-white sm:block lg:hidden">
                      <span className="flex items-center">
                        {statusIcon(plan.status)}
                        {plan.from} - {plan.to}
                      </span>
                      <span className="block lg:hidden">{plan.date}</span>
                    </div>
                    {planIdx !== 0 ? <div className="absolute right-0 left-6 -top-px h-px bg-darkblue-100" /> : null}
                  </td>
                  <td
                    className={classNames(
                      planIdx === 0 ? '' : 'border-t border-darkblue-100',
                      'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                    )}
                  >
                    {plan.to}
                  </td>
                  <td
                    className={classNames(
                      planIdx === 0 ? '' : 'border-t border-darkblue-100',
                      'px-3 py-3.5 text-sm text-white table-cell'
                    )}
                  >
                    {plan.amount} {plan.currency}
                  </td>
                  <td
                    className={classNames(
                      planIdx === 0 ? '' : 'border-t border-darkblue-100',
                      'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                      )}
                  >
                    {plan.fee} {plan.currency}
                  </td>
                  <td
                    className={classNames(
                      planIdx === 0 ? '' : 'border-t border-darkblue-100',
                      'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                      )}
                  >
                    {plan.transId}
                  </td>
                  <td
                    className={classNames(
                      planIdx === 0 ? '' : 'border-t border-darkblue-100',
                      'relative px-3 py-3.5 text-sm text-white hidden lg:table-cell group'
                    )}
                  >
                      {statusIcon(plan.status)}
                    <div className="text-white absolute inset-y-0 right-0 flex items-center px-4">
                      <div className="relative flex flex-col items-center group">
                        <div className="w-48 absolute right-0 bottom-0 flex flex-col items-right hidden mb-3 group-hover:flex">
                          <span className="leading-4 min z-10 p-2 text-xs text-white whitespace-no-wrap bg-gray-600 shadow-lg rounded-md">
                            Test
                          </span>
                          <div className="absolute right-0 bottom-0 origin-top-left w-3 h-3 -mt-2 rotate-45 bg-gray-600"></div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td
                    className={classNames(
                      planIdx === 0 ? '' : 'border-t border-darkblue-100',
                      'px-3 py-3.5 text-sm text-white  hidden lg:table-cell'
                    )}
                  >
                    {plan.date}
                  </td>
                  <td
                    className={classNames(
                      planIdx === 0 ? '' : 'border-t border-transparent',
                      'relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-medium'
                    )}
                  >
                  <button
                    type="button"
                    className="group text-white bg-pink-primary relative w-full flex justify-center py-2 px-2 border-0 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out"
                  >
                    More<span className="sr-only"></span>
                  </button>
                  {planIdx !== 0 ? <div className="absolute right-6 left-0 -top-px h-px bg-darkblue-100" /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

export default Example;