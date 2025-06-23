import WalletTransfer from './Wallet';
import WalletTransferContent from './WalletTransferContent';

const WalletTransferButton = () => {

    return <div className='rounded-xl bg-secondary-500 divide-y divide-secondary-300 px-3'>
        <div className="py-3 ">
            <p className="text-lg  text-secondary-text">
                Sending from wallet
            </p>
        </div>
        <div>
            <WalletTransferContent />
            <WalletTransfer />
        </div>
    </div>
}

export default WalletTransferButton
