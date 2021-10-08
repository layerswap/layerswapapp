export class SelectMenuItem<T> implements ISelectMenuItem {
    id: string;
    name: string;
    imgSrc: string;
    isEnabled: boolean;
    baseObject: T;

    constructor(baseObject: T, id: string, name: string, imgSrc: string, isEnabled: boolean = true) {
        this.baseObject = baseObject;
        this.id = id;
        this.name = name;
        this.imgSrc = imgSrc;
        this.isEnabled = isEnabled;
    }
}

export interface ISelectMenuItem {
    id: string;
    name: string;
    imgSrc: string;
    isEnabled: boolean;
}