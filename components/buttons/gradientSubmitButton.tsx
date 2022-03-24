import { FC } from "react";
import SubmitButton from "./submitButton";
import { SubmitButtonProps } from "../submitButtonProps";

const GradientSubmitButton: FC<SubmitButtonProps> = (props) => {
    return <SubmitButton bgColor="bg-gradient-to-r from-indigo-400 to-pink-400" {...props}></SubmitButton>
}

export default GradientSubmitButton;