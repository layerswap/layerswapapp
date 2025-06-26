import { FC, useState } from "react";
import { Form, useFormikContext } from "formik";
import { Partner } from "@/Models/Partner";
import NetworkExchangeTabs from "./NetworkExchangeTabs";
import NetworkForm from "./NetworkForm";
import ExchangeForm from "./ExchangeForm";
import DepositMethodComponent from "@/components/FeeDetails/DepositMethod";
import { UrlQuerySync } from "./UrlQuerySync";
import dynamic from "next/dynamic";

const RefuelModal = dynamic(() => import("@/components/FeeDetails/RefuelModal"), {
    loading: () => <></>,
});

type Props = {
    partner?: Partner;
};

const SwapForm: FC<Props> = ({ partner }) => {
    const [openRefuelModal, setOpenRefuelModal] = useState(false);

    return (
        <Form className="h-full grow flex flex-col justify-between">
            <DepositMethodComponent />
            <UrlQuerySync
                fieldMapping={{
                    from: "name",
                    to: "name",
                    fromAsset: "symbol",
                    toAsset: "symbol",
                    currencyGroup: "symbol",
                    fromExchange: "name",
                    toExchange: "name",
                }}
                excludeFields={["refuel"]}
            />
            <NetworkExchangeTabs
                networkForm={<NetworkForm partner={partner} setOpenRefuelModal={setOpenRefuelModal} />}
                exchangeForm={<ExchangeForm partner={partner} setOpenRefuelModal={setOpenRefuelModal} />}
            />
            <RefuelModal openModal={openRefuelModal} setOpenModal={setOpenRefuelModal} />
        </Form>
    );
};

export default SwapForm;