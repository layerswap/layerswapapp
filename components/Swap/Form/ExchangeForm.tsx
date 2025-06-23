import { FC } from "react"
import { Form } from "formik";

const ExchangeForm: FC = () => {
    return (
        <div className="relative h-full w-full flex">
            <Form className="h-full grow flex flex-col justify-between">
                <div className="text-white p-4">
                    Exchange form
                </div>
            </Form>
        </div>
    )
}

export default ExchangeForm;