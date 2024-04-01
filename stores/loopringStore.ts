import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { UnlockedAccount } from '../lib/loopring/defs';

type LoopringAccountStore = {
    unlockedAccount: UnlockedAccount | undefined;
    setUnlockedAccount: (account: UnlockedAccount | undefined) => void;
};


export const useLoopringUnlockedAccount = create(
    persist<LoopringAccountStore>(
        (set) => ({
            unlockedAccount: undefined,
            setUnlockedAccount: (account) => {
                set(() => ({ unlockedAccount: account }));
            },
        }),
        {
            name: 'loopringAccount',
            storage: createJSONStorage(() => sessionStorage),
        }
    ),
)