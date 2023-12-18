import { Fuel } from "lucide-react";
import { CalculateReceiveAmount } from "../../../lib/fees";
import { useSettingsState } from "../../../context/settings";


const ModalContent = ({ balanceInfo, values, from_native_currency }) => {
  const { networks, currencies } = useSettingsState();
  let receive_amount = CalculateReceiveAmount(values, networks, currencies);

  const balancetoShow = balanceInfo.find(i => i.token === 'ETH')
  
  
  return (
    <div className="flex flex-col gap-y-8 items-center">
      <div className="flex items-center gap-x-2">
        <Fuel className="h-8 w-8 text-primary" />
        <h1>Need Gas?</h1>
      </div>
      <p className="font-light text-xs">
        You will get a small amount of {from_native_currency} that you can use to
        pay for gas fees.
      </p>
      <div  className="flex flex-col gap-y-3">
        <div className="flex flex-row gap-x-5 justify-between">
          <span>
            Your {from_native_currency} in {values?.to?.display_name}
          </span>
          <div>
            <span className="font-light text">
              {balancetoShow.amount} {from_native_currency}
            </span>
          </div>
        </div>
        <div className="flex flex-row gap-x-5 justify-between">
          You will receive in {values?.to.display_name}
          <div>
            <span className="font-light text"> {receive_amount} ETH</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalContent;
