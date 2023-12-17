import { useEffect, useState } from "react";
import { Fuel, Info } from "lucide-react";
import ToggleButton from "../../buttons/toggleButton";
import Modal from "../../modal/modal";
import {
  BalancesDataProvider,
  useBalancesState,
} from "../../../context/balances";
import ModalContent from "./ModalContent";

const RefuelBoxComponent = ({
  values,
  handleConfirmToggleChange,
  destination_native_currency,
}) => {
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [noBalance, setNoBalance] = useState<boolean>(false);

  const notEnoughAmountMessage = `I don't have ${values?.from?.native_currency} in ${values?.to?.display_name}, some amount of USDC will be converted to ${values?.from?.native_currency} so you can pay the fees in ${values?.to?.display_name}.`;
  const enoughAmountMessage = "Need gas?";

  const { balances } = useBalancesState();
  const balanceInfo = Object.values(balances)[0]?.map((item) => {
    return item;
  });
  const nativeCurrencyName = values?.to?.native_currency;

  useEffect(() => {
    for (const address in balances) {
      if (balances.hasOwnProperty(address)) {
        // Find the ETH balance for the current address
        const ethBalance = balances[address]?.find(
          (balance) => balance.token === nativeCurrencyName
        );
        if (ethBalance?.amount === 0) {
          setNoBalance(true);
          break;
        }
      }
    }
  }, [values]);

  const displayPriceMessage = noBalance
    ? notEnoughAmountMessage
    : enoughAmountMessage;

  return (
    <BalancesDataProvider>
      <div className="flex items-center gap-x-2 justify-between px-3.5 py-3 bg-secondary-700 border border-secondary-500 rounded-lg mb-4">
        <div className="flex items-center gap-x-2">
          <div className="h-8 w-8 text-primary">
            <Fuel />
          </div>
          <div className="flex flex-col gap-y-2">
            <Modal
              className="bg-[#181c1f]"
              height="full"
              show={openModal}
              setShow={setOpenModal}
            >
              <ModalContent
                noBalance={noBalance}
                balanceInfo={balanceInfo}
                values={values}
              />
            </Modal>

            <p className="text-xs">
              <span>{displayPriceMessage}</span>
            </p>
            <div className="flex">
              <p className="font-light text-xs">
                <span>Get&nbsp;</span>
                <span className="font-semibold">
                  {destination_native_currency}
                </span>
                <span>&nbsp;to pay fees in&nbsp;</span>
                <span>{values.to?.display_name}</span>
              </p>
            </div>

            <div className="flex items-center gap-x-1">
              <p>More details</p>
              <Info
                onClick={() => setOpenModal(true)}
                className="h-4 hover:text-primary-text"
                aria-hidden="true"
                strokeWidth={2.5}
              />
            </div>
          </div>
        </div>

        <ToggleButton
          name="refuel"
          value={noBalance ? true : !!values?.refuel}
          onChange={handleConfirmToggleChange}
        />
      </div>
    </BalancesDataProvider>
  );
};

export default RefuelBoxComponent;
