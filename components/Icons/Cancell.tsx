import React from 'react';

const CancelIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" {...props}  width="24" height="24" viewBox="0 0 116 116" fill="none">
        <circle cx="58" cy="58" r="58" fill="#4E5460" fillOpacity="0.1" />
        <circle cx="58" cy="58" r="45" fill="#4E5460" fillOpacity="0.5" />
        <circle cx="58" cy="58" r="30" fill="#4E5460" />
        <path d="M48 69L68 48" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
        <path d="M48 48L68 69" stroke="white" strokeWidth="3.15789" strokeLinecap="round" />
    </svg>
);

export default CancelIcon;