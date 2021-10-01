import * as React from 'react'

const BackgroundCircle = (props) => (
    <svg {...props} viewBox="0 0 274 274" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="137.918" cy="137.92" r="101.141" fill="url(#paint0_linear)" />
        <circle cx="137" cy="137" r="131" stroke="white" strokeWidth="12" />
        <defs>
            <linearGradient id="paint0_linear" x1="223" y1="137.999" x2="37" y2="137.999" gradientUnits="userSpaceOnUse">
                <stop stopColor="#818CF8" />
                <stop offset="1" stopColor="#F472B6" />
            </linearGradient>
        </defs>
    </svg>
)

export default BackgroundCircle;