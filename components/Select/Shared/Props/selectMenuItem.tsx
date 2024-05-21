import { CurrencyDisabledReason } from "../../../Input/CurrencyFormField";
import { LayerDisabledReason } from "../../Popover/PopoverSelect";

export class SelectMenuItem<T> implements ISelectMenuItem {
    id: string;
    name: string;
    order: number;
    imgSrc: string;
    displayName?: string | undefined;
    isAvailable: {
        value: boolean;
        disabledReason?: LayerDisabledReason | CurrencyDisabledReason | null
    };
    group?: string;
    details?: JSX.Element | JSX.Element[];
    newNetworksIcon?: JSX.Element | JSX.Element[];
    baseObject: T;
    constructor(baseObject: T, id: string, name: string, order: number, imgSrc: string, group?: string, details?: JSX.Element | JSX.Element[]) {
        this.baseObject = baseObject;
        this.id = id;
        this.name = name;
        this.order = order;
        this.imgSrc = imgSrc;
        this.group = group;
        this.details = details
        this.isAvailable = {
            value: true,
            disabledReason: null
        }
    }
}

export interface ISelectMenuItem {
    id: string;
    name: string;
    imgSrc: string;
    displayName?: string | undefined;
    group?: string;
    isAvailable: {
        value: boolean;
        disabledReason?: LayerDisabledReason | CurrencyDisabledReason | null
    };
    details?: JSX.Element | JSX.Element[];
    newNetworksIcon?: JSX.Element | JSX.Element[];
    order?: number;
}
