import { FC, ReactNode } from "react";
import { CheckCircle2, CircleX } from "lucide-react";

type Props = {
    title: ReactNode;
    status: "pending" | "success" | "error";
}
const ActionStatus: FC<Props> = ({ title, status }) => {

    return <div className="flex text-center space-x-2 bg-secondary-700 p-3 rounded-componentRoundness">
        <div className='relative self-center'>
            {resolveIcon(status)}
        </div>
        <p className="text-md text-left self-center text-secondary-text">
            {title}
        </p>
    </div>
}

const resolveIcon = (status: "pending" | "success" | "error") => {
    switch (status) {
        case "pending":
            return <>
                <div className='absolute top-1 left-1 w-4 h-4 md:w-5 md:h-5 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                <div className='absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                <div className='relative top-0 left-0 w-6 h-6 md:w-7 md:h-7 scale-50 bg bg-primary rounded-full '></div>
            </>
        case "success":
            return <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
        case "error":
            return <CircleX className="h-5 w-5 text-red-500" aria-hidden="true" />
    }
}

export default ActionStatus