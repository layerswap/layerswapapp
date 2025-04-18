import { ArrowLeftRight } from "lucide-react";
import { FC, MouseEventHandler } from "react";
import SubmitButton from "./submitButton";

export interface SwapButtonProps {
  isDisabled: boolean;
  isSubmitting: boolean;
  type?: 'submit' | 'reset' | 'button' | undefined;
  onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
  className?: string
  children?: React.ReactNode
}

const SwapButton: FC<SwapButtonProps> = (props) => {
  const swapIcon = <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />;

  return (
    <SubmitButton icon={swapIcon} {...props} />
  );
}

export default SwapButton;