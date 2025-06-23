import { FC } from "react";
import React from "react";
import { Partner } from "@/Models/Partner";
import NetworkExchangeTabs from "./NetworkExchangeTabs";
import NetworkForm from "./NetworkForm";
import ExchangeForm from "./ExchangeForm";

type Props = {
    partner?: Partner,
}

const SwapForm: FC<Props> = ({ partner }) => {
    return (
        <div className="relative h-full w-full flex">
            <NetworkExchangeTabs
                networkForm={<NetworkForm partner={partner} />}
                exchangeForm={<ExchangeForm />}
            />
        </div>
    )
}

export default SwapForm