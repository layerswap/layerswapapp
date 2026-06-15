import { X } from 'lucide-react';
import React from 'react';

interface ErrorDismissButtonProps {
    onClick: () => void;
}

export const ErrorDismissButton: React.FC<ErrorDismissButtonProps> = ({ onClick }) => {
    return (
        <button
            type="button"
            aria-label="Dismiss error"
            onClick={onClick}
            className="shrink-0 text-secondary-text hover:text-primary-text transition-colors"
        >
            <X className="w-4 h-4" />
        </button>
    );
};
