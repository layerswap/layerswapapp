import { Context, FC, createContext, useContext, useState } from 'react';

type DepositMethodState = {
    showModal: boolean;
    canRedirect: boolean;
    setShowModal: (value: boolean) => void;
    setCanRedirect: (value: boolean) => void;
}

export const DepositMethodContext = createContext<DepositMethodState | undefined>(undefined);

type Props = {
    children?: JSX.Element | JSX.Element[];
    onRedirect: () => void;
    canRedirect?: boolean;
}

function timeout(delay: number) {
    return new Promise(res => setTimeout(res, delay));
}

export const DepositMethodProvider: FC<Props> = ({ children, onRedirect }) => {
    const [showModal, setShowModal] = useState(false);
    const [canRedirect, setCanRedirect] = useState<boolean>(true);

    const handleShowDepositModal = async (value: boolean) => {
        if (canRedirect && value === true) {
            onRedirect()
            await timeout(330);
            setShowModal(value);
        }
        else {
            setShowModal(value);
        }
    }

    const contextValue: DepositMethodState = {
        showModal,
        canRedirect,
        setShowModal: handleShowDepositModal,
        setCanRedirect,
    };

    return (
        <DepositMethodContext.Provider value={contextValue}>
            {children}
        </DepositMethodContext.Provider>
    );
};

export function useDepositMethod() {
    const data = useContext(DepositMethodContext as Context<DepositMethodState>);

    if (data === null) {
        throw new Error('useFee must be used within a FeeProvider');
    }

    return data;
}