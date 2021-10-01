import * as React from 'react'

const BackgroundRectangle = (props) => (
    <svg {...props} viewBox="0 0 272 153" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="245" y="23" width="130" height="245" rx="12" transform="rotate(90 245 23)" fill="url(#paint1_linear)" />
        <rect x="268.5" y="3.5" width="123" height="238" rx="8.5" transform="rotate(90 268.5 3.5)" stroke="white" strokeWidth="7" />
        <defs>
            <linearGradient id="paint1_linear" x1="364.679" y1="145.595" x2="245.143" y2="145.595" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F472B6" />
                <stop offset="1" stopColor="#818CF8" />
            </linearGradient>
        </defs>
    </svg>
)

export default BackgroundRectangle;