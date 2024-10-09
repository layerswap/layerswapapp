import Modal from "../../modal/modal"
import { FC, useState } from "react"
import dynamic from "next/dynamic"
import Snippet from "./Snippet"
import { AnimatePresence, motion } from "framer-motion"

const Header = dynamic(() => import("./Header"), {
    loading: () => <></>
})
const Content = dynamic(() => import("./History"), {
    loading: () => <Snippet />
})

type Props = {
    children: JSX.Element | JSX.Element[];
    title: string;
    loadExplorerSwaps: boolean;
}

const SwapsListModal: FC<Props> = ({ children, title, loadExplorerSwaps }) => {
    const [openTopModal, setOpenTopModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    return <span className="text-secondary-text cursor-pointer relative">
        {
            <>
                <span onClick={() => setOpenTopModal(true)}>
                    {children}
                </span>
                <Modal height="full"
                    modalId="swaphistory"
                    show={openTopModal}
                    setShow={setOpenTopModal}
                    header={<Header
                        setRefreshing={setRefreshing}
                        loadExplorerSwaps={loadExplorerSwaps}
                        title={title}
                    />}>
                    <AnimatePresence>
                        <Content
                            loadExplorerSwaps={loadExplorerSwaps}
                            refreshing={refreshing}
                        />
                    </AnimatePresence>
                </Modal>
            </>
        }
    </span >
}

export default SwapsListModal