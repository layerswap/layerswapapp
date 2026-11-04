import { createContext, useContext } from "react";

type ConsolidationHost = {
    open: (recordId: string) => void;
    /** The record whose sheet is currently showing. */
    openId: string | undefined;
};

/** Lets form content (e.g. the resume card) reopen a saved multi-token send in `FormWrapper`'s drawer. */
const ConsolidationHostContext = createContext<ConsolidationHost | null>(null);

export const ConsolidationHostProvider = ConsolidationHostContext.Provider;

export const useConsolidationHost = () => useContext(ConsolidationHostContext);
