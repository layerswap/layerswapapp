import { FC } from "react"
import { useIntercom } from "react-use-intercom"

const ContactSupport: FC<{ children?: React.ReactNode }> = ({ children }) => {
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ customAttributes: { } })

    return <span onClick={() => {
        boot();
        show();
        updateWithProps()
    }}>
        {children}
    </span>
}
export default ContactSupport