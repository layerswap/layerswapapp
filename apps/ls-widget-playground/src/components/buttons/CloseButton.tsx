import { X } from 'lucide-react';
export function CloseButton() {
    return (
        <button
            type='button'
            className='p-1 rounded-full bg-transparent hover:bg-primary-500 transition-colors '>
            <X className="w-5 h-5" />
        </button>
    );
}