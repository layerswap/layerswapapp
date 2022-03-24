import { MouseEventHandler } from "react";

export class SubmitButtonProps {
    isDisabled: boolean;
    isSubmitting: boolean;
    type?: 'submit' | 'reset' | 'button' | undefined;
    onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
    bgColor?: string | undefined;
}
