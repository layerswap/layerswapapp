import Image from 'next/image'

type SelectItemWrapperProps = {
    children: JSX.Element | JSX.Element[];
}
const SeelctItem = ({ children }: SelectItemWrapperProps) => {
    return <div className="flex items-center justify-between gap-3 w-full overflow-hidden cursor-pointer">
        <div className="relative flex items-center  pl-1 w-full space-x-2">
            {children}
        </div>
    </div>
}
type SeelctItemLogoProps = {
    imgSrc: string;
    altText: string
}
const Logo = ({ imgSrc, altText }: SeelctItemLogoProps) => {
    return <div className="flex-shrink-0 relative">
        <Image
            src={imgSrc}
            alt={altText}
            height="40"
            width="40"
            loading="eager"
            className="rounded-md object-contain"
        />
    </div>
}

type SeelctItemTitleProps = {
    title: string;
}
const Title = ({ title }: SeelctItemTitleProps) => {
    return <div className="flex justify-between w-full">
        <span className="flex items-center pb-0.5">
            {title}
        </span>
    </div>
}

SeelctItem.Logo = Logo
SeelctItem.Title = Title

export { SeelctItem }