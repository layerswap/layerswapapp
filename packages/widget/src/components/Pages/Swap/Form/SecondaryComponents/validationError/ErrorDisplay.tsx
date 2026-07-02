import React from 'react';

interface ErrorDisplayProps {
    icon: React.ReactNode;
    title: React.ReactNode;
    message?: string;
    action?: React.ReactNode;
    footer?: React.ReactNode;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ icon, title, message, action, footer }) => {
    return (
        <div className="flex flex-col p-3 rounded-2xl bg-secondary-400">
            <div className="flex items-start gap-2">
                <span className="shrink-0 p-0.5">{icon}</span>
                <div className="flex flex-col gap-1 flex-1">
                    <p className="text-white font-medium leading-4 text-base mt-0.5">
                        {title}
                    </p>
                    {message && (
                        <p className="text-secondary-text text-sm leading-4.5">{message}</p>
                    )}
                </div>
                {action}
            </div>
            {footer}
        </div>
    );
};
