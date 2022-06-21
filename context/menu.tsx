import React, { useCallback, useEffect } from 'react'

const MenuStateContext = React.createContext<ContextType>(null);

type ContextType = {
    menuVisible:boolean,
    setMenuVisible:(value:boolean)=>void
}

export function MenuProvider({ children }) {

    const [menuVisible, setMenuVisible] = React.useState<boolean>(true)

    return (
        <MenuStateContext.Provider value={{ menuVisible, setMenuVisible }}>
                {children}
        </MenuStateContext.Provider>
    )
}

export function useMenuState() {
    const data = React.useContext(MenuStateContext);

    if (data === undefined) {
        throw new Error('useMenuState must be used within a MenuStateProvider');
    }

    return data;
}
