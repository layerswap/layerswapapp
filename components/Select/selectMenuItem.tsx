export class SelectMenuItem<T> implements ISelectMenuItem {
    id: string;
    name: string;
    order: number;
    imgSrc: string;
    isAvailable: boolean = true;
    baseObject: T;
    isDefault: boolean;

    constructor(baseObject: T, id: string, name: string, order:number, imgSrc: string, isEnabled: boolean = true, isDefault = false) {
        this.baseObject = baseObject;
        this.id = id;
        this.name = name;
        this.order = order;
        this.imgSrc = imgSrc;
        this.isDefault = isDefault;
    }
}

export interface ISelectMenuItem {
    id: string;
    name: string;
    imgSrc: string;
    isDefault: boolean;
}