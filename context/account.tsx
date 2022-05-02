import React from 'react'

const AccountStateContext = React.createContext<any>(null);


export function AccountProvider({ children, data }: { children, data: { chainId: any, account: any } }) {
  const [missions, setMissions] = React.useState([]);

  const updateFns = {
    // if we need to modify the missions, register those functions here
  };

  return (
    <AccountStateContext.Provider value={data}>
      {children}
    </AccountStateContext.Provider>
  );
}

export function useAccountState() {
  const data = React.useContext(AccountStateContext);

  if (data === undefined) {
    throw new Error('useAccountState must be used within a AccountStateProvider');
  }

  return data;
}
