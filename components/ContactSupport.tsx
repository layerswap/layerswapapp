import { FC } from "react"
import { useIntercom } from "react-use-intercom"

const ContactSupport: FC<{}> = ({ children }) => {
    const { boot, show } = useIntercom()

    return <span onClick={() => { boot(); show(); }}>{children}</span>
}
export default ContactSupport