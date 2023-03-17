import Image from "next/image"

const HighlightedValue = ({ value }) => {
    return (
        <span className='inline-block m-1'>
            <span className='flex items-center gap-1 py-1 bg-slate-700 rounded-sm px-2 text-sm'>
                <Image src={value.imgSrc}
                    alt="Project Logo"
                    height="15"
                    width="15"
                    className='rounded-sm'
                />
                <span className="text-white">{value.name}</span>
            </span>
        </span>
    )
}

export default HighlightedValue