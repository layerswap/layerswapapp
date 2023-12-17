import { Fuel } from "lucide-react";
import FeeDetails from "../../DisclosureComponents/FeeDetails";
const ModalContent = ({ noBalance, balanceInfo, values }) => {
  return (
    <div className="flex flex-col gap-y-4 items-center">
      <div className="flex items-center gap-x-2">
        <Fuel className="h-8 w-8 text-primary" />
        <h1>Need Gas?</h1>
      </div>
      <p className="font-light text-xs">
        You will get a small amount of ETH that you can use to pay for gas fees.
      </p>

      <table className="w-full">
        <thead>
          <tr>
            <th className="p-4 text-center">
              {balanceInfo ? "Currency" : null}
            </th>
            <th className="p-4 text-center">{balanceInfo ? "Amount" : null}</th>
          </tr>
        </thead>
        <tbody>
          {balanceInfo?.map((item, key) => (
            <tr key={key}>
              <td className="p-4 text-center">{item.token}</td>
              <td className="p-4 text-center">{item.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <FeeDetails values={values} />
    </div>
  );
};

export default ModalContent;
