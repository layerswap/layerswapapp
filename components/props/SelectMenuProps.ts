import { ISelectMenuItem } from "../utils/selectMenuItem";

export interface SelectMenuProps {
    name: string;
    value: ISelectMenuItem;
    values: ISelectMenuItem[];
    label: string;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void
}