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
        type="button"
        key={tab.id}
        onClick={() => onCLick(tab.id)}
        className={`${activeTabId === tab.id ? "text-secondary-text" : "text-secondary-text/50 hover:text-secondary-text"
            } grow rounded-md text-left relative py-3 px-5 text-sm transition bg-secondary-800`}
        style={{
            WebkitTapHighlightColor: "transparent",
        }}
    >
        <div className="flex flex-row items-center gap-2">
            <span className="z-30 relative">{tab.icon}</span>
            {activeTabId === tab.id && (
                <motion.span
                    layoutId="bubble"
                    className="absolute inset-0 z-29 bg-secondary-700/40  border-2 border-secondary-600"
                    style={{ borderRadius: '6px' }}
                    transition={{ type: "spring", bounce: 0.1, duration: 0.3 }}
                />
            )}
            <span className="z-30 relative">{tab.label}</span>
        </div>
    </button>
}

export default Header