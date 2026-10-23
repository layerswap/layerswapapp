import { useState, type Ref } from 'react';
import { Pencil } from 'lucide-react';
import { FilledX } from '@layerswap/ui-kit/components';

type Props = {
    value: string;
    onChange: (address: string) => void;
    name: string;
    inputRef?: Ref<HTMLInputElement>;
    onEnter?: () => void;
    invalid?: boolean;
    describedBy?: string;
    fullWidth?: boolean;
};

/** Shared manual address entry for destination and source-network refunds. */
export default function AddressTextInput({ value, onChange, name, inputRef, onEnter, invalid, describedBy, fullWidth }: Props) {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <div className={`relative flex grow rounded-lg shadow-xs focus-within:ring-0 focus-within:ring-primary focus-within:border-primary w-full ${fullWidth ? '' : 'lg:w-fit'}`}>
            <input
                onChange={e => onChange(e.target.value)}
                value={value}
                placeholder="Enter address"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                type="text"
                name={name}
                id={name}
                ref={inputRef}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={e => {
                    if (e.key === 'Enter' && onEnter) {
                        e.preventDefault();
                        onEnter();
                    }
                }}
                className="autofill-secondary pl-4 pr-12 disabled:cursor-not-allowed grow h-12 border border-secondary-800 focus:border-primary leading-4 placeholder:text-primary-text-tertiary/80 focus:placeholder:text-left placeholder:font-normal focus:placeholder:pl-0 placeholder:pl-8 block font-semibold w-full !bg-secondary-500 rounded-lg truncate hover:overflow-x-scroll focus:ring-0 focus:outline-hidden"
            />
            {!isFocused && !value && <Pencil className="h-5 w-5 text-primary-text-tertiary absolute inset-y-0 top-[calc(50%-10px)] left-4" />}
            {value && (
                <button type="button" aria-label="Clear address" className="absolute top-1/2 -translate-y-1/2 right-3 text-secondary-text hover:text-primary-text transition" onClick={() => onChange('')}>
                    <FilledX className="h-5 w-5" />
                </button>
            )}
        </div>
    );
}
