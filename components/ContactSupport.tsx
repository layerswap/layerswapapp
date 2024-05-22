import { FC } from "react"
import { useIntercom } from "react-use-intercom"
import { useAuthState } from "../context/authContext"

const ContactSupport: FC<{ children?: React.ReactNode }> = ({ children }) => {
    const { email, userId } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ userId, customAttributes: { email: email, } })

    return <span onClick={() => {
        boot();
        show();
        updateWithProps()
    }}>
        {children}
    </span>
}
export default ContactSupport