import { FC } from "react"
import { useIntercom } from "react-use-intercom"

const ContactSupport: FC<{ children?: React.ReactNode }> = ({ children }) => {
    const { boot, show, update } = useIntercom()

    return <span onClick={() => {
        boot();
        show();
        update()
    }}>
        {children}
    </span>
}
export default ContactSupport