import { ISelectMenuItem } from './selectMenuItem'

export interface SelectProps {
    values: ISelectMenuItem[],
    value?: ISelectMenuItem;
    setValue: (value: ISelectMenuItem) => void;
}