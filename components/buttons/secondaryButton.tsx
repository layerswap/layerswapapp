import { ButtonHTMLAttributes, FC } from "react"

type buttonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type SecondaryButtonProps = {
    size?: buttonSize
    children: React.ReactNode
}

const SecondaryButton: FC<ButtonHTMLAttributes<HTMLButtonElement> & SecondaryButtonProps> = (props) => {

    const size = props.size || 'md'

    let defaultStyle = `rounded-md duration-200 break-keep transition bg-secondary-500 hover:bg-secondary-400 border border-secondary-400 hover:border-secondary-200 font-semibold text-primary-buttonTextColor shadow-sm cursor-pointer ${props.className} `
    console.log(defaultStyle)
    switch (size) {
        case 'xs':
            defaultStyle += " px-2 py-1 text-xs";
            break;
        case 'sm':
            defaultStyle += " px-2 py-1 text-sm";
            break;
        case 'md':
            defaultStyle += " px-2.5 py-1.5 text-sm";
            break;
        case 'lg':
            defaultStyle += " px-3 py-2 text-sm";
            break;
        case 'xl':
            defaultStyle += " px-3.5 py-2.5 text-sm";
            break;
    }

    return (
        <button
            {...props}
            type="button"
            className={defaultStyle}
        >
            {props.children}
        </button>
    )
}

export default SecondaryButton
