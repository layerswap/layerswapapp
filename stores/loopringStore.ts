import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { UnlockedAccount } from '../lib/loopring/defs';

type LoopringAccountStore = {
    account: LoopringAccount | undefined;
    setAccount: (account: LoopringAccount | undefined) => void;
};

export type LoopringAccount = {
    unlockedAccount: UnlockedAccount;
    address: `0x${string}`
}


export const useLoopringUnlockedAccount = create(
    persist<LoopringAccountStore>(
        (set) => ({
            account: undefined,
            setAccount: (account) => {
                set(() => ({ account }));
            },
        }),
        {
            name: 'loopringAccount',
            storage: createJSONStorage(() => sessionStorage),
        }
    ),
)