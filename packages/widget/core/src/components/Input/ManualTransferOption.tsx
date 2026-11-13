import { QrCode } from 'lucide-react';
import FilledCheck from '@/components/Icons/FilledCheck';

type Props = {
    onSelect: () => void;
    selected?: boolean;
    className?: string;
};

export default function ManualTransferOption({ onSelect, selected, className }: Props) {
    return (
        <div className={className}>
            <div className="flex items-center justify-center gap-2 text-secondary-text mb-3" aria-hidden="true">
                <hr className="border-secondary-400 w-full" />
                <span>or</span>
                <hr className="border-secondary-400 w-full" />
            </div>
            <button
                type="button"
                onClick={onSelect}
                aria-pressed={!!selected}
                data-ls-action="select_manual_transfer"
                className="navigation-focus-ring-child w-full flex items-center justify-between gap-3 rounded-lg bg-secondary-500 p-3 py-4 text-secondary-text hover:bg-secondary-400 cursor-pointer text-left"
            >
                <QrCode className="w-9 h-9 shrink-0" aria-hidden="true" />
                <span className="grow">
                    <span className="block text-base text-primary-text">Transfer Manually</span>
                    <span className="block text-xs">Send crypto from any wallet or exchange.</span>
                </span>
                {selected ? <FilledCheck /> : null}
            </button>
        </div>
    );
}
