import { createContext } from "react";
import { useSwapDataState } from "../context/swap"

export const SimpleComponent = () => {
    const { swap } = useSwapDataState()
    return <div>Swap id: {swap?.id}</div>
}




export const UserContext = createContext(null);

export default function App() {
  return (
    <UserContext.Provider value="Reed">
      <User />
    </UserContext.Provider>
  )
}

function User() {
  return (
    <UserContext.Consumer>
      {value => <h1>{value}</h1>} 
      {/* prints: Reed */}
    </UserContext.Consumer>
  )
}