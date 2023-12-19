import { FC, useEffect } from "react"
import { useLoadingState } from "../context/loadingContext"

type Props = {
    name: string
}
const LoadingCard: FC<Props> = ({ name }) => {
    const { start, end } = useLoadingState()
    useEffect(() => {
        start(name)
        return () => { console.log(`ending ${name}`); end(name) }
    }, [name])

    return <div></div>
}
export default LoadingCard