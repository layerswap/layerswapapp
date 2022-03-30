export class SelectMenuItem<T> implements ISelectMenuItem {
    id: string;
    name: string;
    logo_url: string;
    isEnabled: boolean;
    baseObject: T;
    isDefault: boolean;

    constructor(baseObject: T, id: string, name: string, imgSrc: string, isEnabled: boolean = true, isDefault = false) {
        this.baseObject = baseObject;
        this.id = id;
        this.name = name;
        this.logo_url = imgSrc;
        this.isEnabled = isEnabled;
        this.isDefault = isDefault;
    }
}

export interface ISelectMenuItem {
    id: string;
    name: string;
    logo_url: string;
    isEnabled: boolean;
    isDefault: boolean;
}