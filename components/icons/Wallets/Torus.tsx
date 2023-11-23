const Torus = (props) => {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 422 422"
            fill="none"
        >
            <rect width="422" height="422" fill="white" />
            <rect
                x="11"
                y="11"
                width="400"
                height="400"
                rx="112"
                fill="url(#paint0_linear)"
            />
            <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M136.375 106C125.122 106 116 115.122 116 126.375V150.11C116 161.363 125.122 170.486 136.375 170.486H172.424V303.264C172.424 314.516 181.546 323.639 192.799 323.639H216.535C227.787 323.639 236.91 314.516 236.91 303.264V150.283C236.91 150.226 236.91 150.168 236.91 150.11V126.375C236.91 115.122 227.788 106 216.535 106H192.799H136.375Z"
                fill="white"
            />
            <path
                d="M285.28 170.486C303.087 170.486 317.523 156.05 317.523 138.243C317.523 120.436 303.087 106 285.28 106C267.473 106 253.037 120.436 253.037 138.243C253.037 156.05 267.473 170.486 285.28 170.486Z"
                fill="white"
            />
            <defs>
                <linearGradient
                    id="paint0_linear"
                    x1="424"
                    y1="427"
                    x2="11"
                    y2="11"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stop-color="#0016DE" />
                    <stop offset="1" stop-color="#0364FF" />
                </linearGradient>
            </defs>
        </svg>
    );
};

export default Torus;
