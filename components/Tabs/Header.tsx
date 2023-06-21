import { motion } from "framer-motion"
import { FC } from "react"
import { Tab } from "./Index"
import { WithdrawType } from "../../lib/layerSwapApiClient"

type HeaderProps = {
    tab: Tab,
    activeTabId: string,
    onCLick: (id: WithdrawType) => void
}

const Header: FC<HeaderProps> = ({ tab, onCLick, activeTabId }) => {
    return <button
        key={tab.id}
        onClick={() => onCLick(tab.id)}
        className={`${activeTabId === tab.id ? "bg-secondary-700 text-primary-text" : "text-primary-text/50 hover:text-primary-text bg-secondary-800"
            } grow rounded-md text-left relative py-3 px-5 text-sm transition`}
        style={{
            WebkitTapHighlightColor: "transparent",
        }}
    >
        <span>{tab.icon}</span>
        {activeTabId === tab.id && (
            <motion.span
                layoutId="bubble"
                className="absolute inset-0 z-10 bg-secondary-700 mix-blend-lighten border-2 border-secondary-500"
                style={{ borderRadius: '6px' }}
                transition={{ type: "spring", bounce: 0.1, duration: 0.3 }}
            />
        )}
        <span>{tab.label}</span>
    </button>
}



export default Header