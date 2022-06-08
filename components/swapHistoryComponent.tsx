/* This example requires Tailwind CSS v2.0+ */
const plans = [
    {
      id: 1,
      from: 'Coinbase',
      to: 'Loopring',
      amount: 2154,
      fee: 12.38,
      date: '12.02.22',
      currency: '(LRC)'
    },
    {
      id: 2,
      from: 'Binance',
      to: 'Arbitrum',
      amount: 0.15,
      fee: 0.0028,
      date: '22.03.22',
      currency: '(ETH)'
    },
    // More plans...
  ]
  
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
                  From
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                >
                  To
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-500 lg:table-cell"
                >
                  Fee
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-500">
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
                    <div className="text-white">
                      {plan.from}
                    </div>
                    <div className="mt-1 flex flex-col text-white sm:block lg:hidden">
                      <span>
                        {plan.from} - {plan.to}
                      </span>
                      <span className="hidden sm:inline"> · </span>
                      <span>{plan.amount}{plan.currency}</span>
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
                      'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                    )}
                  >
                    {plan.amount}{plan.currency}
                  </td>
                  <td
                    className={classNames(
                      planIdx === 0 ? '' : 'border-t border-darkblue-100',
                      'hidden px-3 py-3.5 text-sm text-white lg:table-cell'
                      )}
                >
                  {plan.fee}{plan.currency}
                </td>
                <td
                  className={classNames(
                    planIdx === 0 ? '' : 'border-t border-darkblue-100',
                    'px-3 py-3.5 text-sm text-white'
                  )}
                >
                  <div className="sm:hidden">{plan.date}</div>
                  <div className="hidden sm:block">{plan.date}</div>
                </td>
                <td
                  className={classNames(
                    planIdx === 0 ? '' : 'border-t border-transparent',
                    'relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-medium'
                  )}
                >
                  <button
                    type="button"
                    className="group disabled:text-white-alpha-100 disabled:bg-pink-primary-600 disabled:cursor-not-allowed bg-pink-primary relative w-full flex justify-center py-2 px-2 border-0 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition duration-400 ease-in-out"
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