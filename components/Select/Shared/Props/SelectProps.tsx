import { ISelectMenuItem } from '../../Shared/Props/selectMenuItem'

export interface SelectProps {
    values: ISelectMenuItem[],
    value: ISelectMenuItem;
    setValue: (value: ISelectMenuItem) => void;
}