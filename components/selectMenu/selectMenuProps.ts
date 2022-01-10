import { ISelectMenuItem } from "./selectMenuItem";

export interface SelectMenuProps {
    name: string;
    value: ISelectMenuItem;
    values: ISelectMenuItem[];
    label: string;
    disabled: boolean;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void
}