import React from 'react';
import { X } from 'lucide-react';

const ErrorDismissButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        type="button"
        aria-label="Dismiss error"
        onClick={onClick}
        className="shrink-0 text-secondary-text hover:text-primary-text transition-colors"
    >
        <X className="h-4 w-4" />
    </button>
);

export default ErrorDismissButton;