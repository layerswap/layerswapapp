import '@rainbow-me/rainbowkit/styles.css';
import { FC } from 'react';
import {
    ConnectButton,
} from '@rainbow-me/rainbowkit';

const RainbowKit: FC = ({ children }) => {
    return (
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openChainModal,
                openConnectModal,
                mounted,
            }) => {
                const ready = mounted;
                const connected =
                    ready &&
                    account &&
                    chain
                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            'style': {
                                opacity: 0,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            },
                        })}
                    >
                        {(() => {
                            if (!connected) {
                                return (
                                    <span className='w-full cursor-pointer' onClick={openConnectModal} >
                                        {children}
                                    </span>
                                );
                            }

                            if (chain.unsupported) {
                                return (
                                    <button onClick={openChainModal} type="button">
                                        Change network
                                    </button>
                                );
                            }
                            return (
                                <></>
                            );
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    )
}

export default RainbowKit;