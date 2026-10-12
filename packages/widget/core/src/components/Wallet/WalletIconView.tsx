import AddressIcon from '@/components/Common/AddressIcon';
import WalletIconPresentation, {
    type WalletIconPresentationProps,
} from './WalletIconPresentation';
export default function WalletIconView(props: WalletIconPresentationProps) {
    return (
        <WalletIconPresentation
            {...props}
            addressIcon={
                props.wallet.address && (
                    <AddressIcon
                        address={props.wallet.address}
                        size={props.size ?? 24}
                        className={props.className}
                    />
                )
            }
        />
    );
}
