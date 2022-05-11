export class SelectMenuItem<T> implements ISelectMenuItem {
    id: string;
    name: string;
    imgSrc: string;
    isEnabled: boolean;
    isAvailable: boolean = true;
    baseObject: T;
    isDefault: boolean;

    constructor(baseObject: T, id: string, name: string, imgSrc: string, isEnabled: boolean = true, isDefault = false) {
        this.baseObject = baseObject;
        this.id = id;
        this.name = name;
        this.imgSrc = imgSrc;
        this.isEnabled = isEnabled;
        this.isDefault = isDefault;
    }
}

export interface ISelectMenuItem {
    id: string;
    name: string;
    imgSrc: string;
    isEnabled: boolean;
    isDefault: boolean;
}