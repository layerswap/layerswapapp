import { create } from 'zustand'
import * as anchor from "@coral-xyz/anchor";

export type PDAParameters = {
    htlcTokenAccount: anchor.web3.PublicKey;
    htlcKey: anchor.web3.PublicKey;
    htlcBump: number;
    phtlcTokenAccount: anchor.web3.PublicKey;
    phtlcKey: anchor.web3.PublicKey;
    phtlcBump: number;
    commitCounter: anchor.web3.PublicKey;
    lockIdStruct: anchor.web3.PublicKey;
}

interface PDAState {
    pda: PDAParameters | undefined;
    setPDA: (PDA: PDAParameters) => void;
}

export const usePDAStore = create<PDAState>()((set) => ({
    pda: undefined,
    setPDA: (pda) => set(() => {
        return ({
            pda: pda
        })
    }),
}))