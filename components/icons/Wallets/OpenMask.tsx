const OpenMask = (props) => {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" fill="none">
            <path d="M85 0L150 250L215 0H85Z" fill="#A0DDFE" stroke="#A0DDFE" />
            <path d="M215 0L150 250L300 85L215 0Z" fill="#88D3FF" stroke="#88D3FF" />
            <path d="M300 85L150 250L300 215V85Z" fill="#73CBFF" stroke="#73CBFF" />
            <path d="M300 215L150 250L215 300L300 215Z" fill="#5BC1FF" stroke="#5BC1FF" />
            <path d="M215 300L150 250L85 300H215Z" fill="#80CFFF" stroke="#80CFFF" />
            <path d="M85 300L150 250L0 215L85 300Z" fill="#95D9FF" stroke="#95D9FF" />
            <path d="M0 215L150 250L0 85V215Z" fill="#ADE2FF" stroke="#ADE2FF" />
            <path d="M0 85L150 250L85 0L0 85Z" fill="#B7E7FF" stroke="#B7E7FF" />
        </svg>
    )
}

export default OpenMask