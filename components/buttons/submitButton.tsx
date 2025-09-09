import { FC, MouseEventHandler } from "react";
import SpinIcon from "../icons/spinIcon";
import clsx from "clsx";

type buttonStyle = 'outline' | 'filled';
type buttonSize = 'small' | 'medium' | 'large';
type text_align = 'center' | 'left'
type button_align = 'left' | 'right'

export class SubmitButtonProps {
    isDisabled?: boolean;
    isSubmitting?: boolean;
    type?: 'submit' | 'reset' | 'button' | undefined;
    onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
    icon?: React.ReactNode;
    buttonStyle?: buttonStyle = 'filled';
    size?: buttonSize = 'medium';
    text_align?: text_align = 'center'
    button_align?: button_align = 'left';
    className?: string;
    children?: React.ReactNode;
}

const SubmitButton: FC<SubmitButtonProps> = ({ isDisabled, isSubmitting, icon, children, type, onClick, buttonStyle = 'filled', size = 'medium', text_align = 'center', button_align = 'left', className }) => {

    return (
        <button
            disabled={isDisabled || isSubmitting}
            type={type}
            onClick={onClick}

            className={clsx('text-primary focus:outline-none focus:ring-0 items-center space-x-1 disabled:bg-secondary-300 disabled:text-secondary-text/50 disabled:cursor-not-allowed relative w-full flex justify-center font-medium rounded-xl transform hover:brightness-125 transition duration-200 ease-in-out', {
                className,
                'text-primary-buttonTextColor bg-primary-500': buttonStyle === 'filled',
                'py-4 px-4': size === 'large',
                'py-3 px-2 md:px-3': size === 'medium',
                'py-1.5 px-1.5': size === 'small',
            })}
        >
            <span className={`${button_align === "right" ? 'order-last' : 'order-first'} ${text_align === 'center' ? "absolute left-0 inset-y-0 flex items-center pl-3" : "relative"}`}>
                {(!isDisabled && !isSubmitting) && icon}
                {isSubmitting ?
                    <SpinIcon className="animate-spin h-5 w-5" />
                    : null}
            </span>
            <span className={`grow ${text_align === 'left' ? 'text-left' : 'text-center'}`}>{children}</span>
        </button>
    );
}


type DoubleLineTextProps = {
    primaryText: string,
    secondarytext: string,
    colorStyle: 'mltln-text-light' | 'mltln-text-dark',
    reversed?: boolean
}

const text_styles = {
    'mltln-text-light': {
        primary: 'text-primary-actionButtonText',
        secondary: 'text-primary-100'
    },
    'mltln-text-dark': {
        primary: 'text-primary',
        secondary: 'text-primary-600'
    }
}

export const DoubleLineText = ({ primaryText, secondarytext, colorStyle, reversed }: DoubleLineTextProps) => {
    return <div className={`leading-3 flex ${reversed ? 'flex-col-reverse' : 'flex-col'}`}>
        <div className={`text-xs ${text_styles[colorStyle].secondary}`}>{secondarytext}</div>
        <div className={`${text_styles[colorStyle].primary}`}>{primaryText}</div>
    </div>
}

export default SubmitButton;