import { CurrencyDisabledReason } from "../../../Input/CurrencyFormField";
import { LayerDisabledReason } from "../../Popover/PopoverSelect";

export class SelectMenuItem<T> implements ISelectMenuItem {
    id: string;
    name: string;
    order: number;
    imgSrc: string;
    isAvailable: {
        value: boolean;
        disabledReason: LayerDisabledReason | CurrencyDisabledReason | null
    };
    group?: string;
    baseObject: T;
    constructor(baseObject: T, id: string, name: string, order: number, imgSrc: string, group?: string) {
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
    imgSrc: string;
    group?: string;
    isAvailable: {
        value: boolean;
        disabledReason: LayerDisabledReason | CurrencyDisabledReason | null
    };
}