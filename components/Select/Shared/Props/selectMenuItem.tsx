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
    type: ItemType
    group?: string;
    details?: string;
    baseObject: T;
    constructor(baseObject: T, id: string, name: string, order: number, imgSrc: string, type: ItemType, group?: string, details?: string) {
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
        this.type = type
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
    type: ItemType
    details?: string;
    order?: number;
}
type ItemType = 'layer' | 'cex' | 'currency'
