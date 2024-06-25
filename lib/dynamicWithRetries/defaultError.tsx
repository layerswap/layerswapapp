import { useRouter } from "next/router";
import SubmitButton from "../../components/buttons/submitButton";
import { RefreshCcw } from "lucide-react";

const DynamicDefaultError = () => {

    const router = useRouter()

    return (
        <div className="w-full h-full flex flex-col justify-center gap-3 p-3 items-center">
            <h1>Failed to fetch component</h1>
            <div className="w-fit">
                <SubmitButton type="button" size="small" className="w-fit px-10" icon={<RefreshCcw className="h-5 w-5" />} onClick={() => router.reload()}>Retry</SubmitButton>
            </div>
        </div>
    );
}

export default DynamicDefaultError;