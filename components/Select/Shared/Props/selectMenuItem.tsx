export class SelectMenuItem<T> implements ISelectMenuItem {
    id: string;
    name: string;
    order: number;
    imgSrc: string;
    displayName?: string | undefined;
    isAvailable: boolean;
    group?: string;
    details?: JSX.Element | JSX.Element[];
    badge?: JSX.Element | JSX.Element[];
    icon?: JSX.Element | JSX.Element[];
    baseObject: T;
    constructor(baseObject: T, id: string, name: string, order: number, imgSrc: string, isAvailable: boolean, group?: string, details?: JSX.Element | JSX.Element[]) {
        this.baseObject = baseObject;
        this.id = id;
        this.name = name;
        this.order = order;
        this.imgSrc = imgSrc;
        this.group = group;
        this.details = details;
        this.isAvailable = isAvailable
    }
}

export interface ISelectMenuItem {
    id: string;
    name: string;
    imgSrc: string;
    displayName?: string | undefined;
    group?: string;
    isAvailable: boolean;
    details?: JSX.Element | JSX.Element[];
    badge?: JSX.Element | JSX.Element[];
    icon?: JSX.Element | JSX.Element[];
    order?: number;
}
