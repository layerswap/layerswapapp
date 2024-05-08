import { CurrencyDisabledReason } from "../../../Input/CurrencyFormField";
import { LayerDisabledReason } from "../../Popover/PopoverSelect";

export class SelectMenuItem<T> implements ISelectMenuItem {
    id: string;
    name: string;
    menuItemLabel?: React.ReactNode;
    menuItemDetails?: React.ReactNode;
    menuItemImage?: React.ReactNode;
    balanceAmount?: number | undefined;
    order: number;
    imgSrc: string;
    displayName?: string | undefined;
    isAvailable: {
        value: boolean;
        disabledReason?: LayerDisabledReason | CurrencyDisabledReason | null
    };
    group?: string;
    baseObject: T;
    constructor(baseObject: T, id: string, name: string, order: number, imgSrc: string, group?: string, details?: JSX.Element | JSX.Element[]) {
        this.baseObject = baseObject;
        this.id = id;
        this.name = name;
        this.order = order;
        this.imgSrc = imgSrc;
        this.group = group;
        this.isAvailable = {
            value: true,
            disabledReason: null
        }
    }
}

export interface ISelectMenuItem {
    id: string;
    name: string;
    menuItemLabel?: React.ReactNode;
    menuItemDetails?: React.ReactNode;
    menuItemImage?: React.ReactNode;
    balanceAmount?: number | undefined;
    imgSrc: string;
    displayName?: string | undefined;
    group?: string;
    isAvailable: {
        value: boolean;
        disabledReason?: LayerDisabledReason | CurrencyDisabledReason | null
    };
    order?: number;
}
