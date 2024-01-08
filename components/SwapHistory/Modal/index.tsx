import Modal from "../../modal/modal"
import { FC, useState } from "react"
import dynamic from "next/dynamic"

const Header = dynamic(() => import("./Header"), {
    loading: () => <></>
})
const Content = dynamic(() => import("./Content"), {
    loading: () => <></>
})

type Props = {
    statuses: string | number;
    children: JSX.Element | JSX.Element[];
    title: string;
    loadExplorerSwaps: boolean;
}

const SwapsListModal: FC<Props> = ({ children, statuses, title, loadExplorerSwaps }) => {
    const [openTopModal, setOpenTopModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    return <span className="text-secondary-text cursor-pointer relative">
        {
            <>
                <span onClick={() => setOpenTopModal(true)}>
                    {children}
                </span>
                <Modal height="full"
                    show={openTopModal}
                    setShow={setOpenTopModal}
                    header={<Header
                        setRefreshing={setRefreshing}
                        loadExplorerSwaps={loadExplorerSwaps}
                        statuses={statuses}
                        title={title}
                    />}>
                    <Content
                        loadExplorerSwaps={loadExplorerSwaps}
                        statuses={statuses}
                        refreshing={refreshing}
                    />
                </Modal>
            </>
        }
    </span >
}

export default SwapsListModal