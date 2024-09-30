export class SelectMenuItem<T> implements ISelectMenuItem {
    id: string;
    name: string;
    menuItemLabel?: React.ReactNode;
    menuItemDetails?: React.ReactNode;
    menuItemImage?: React.ReactNode;
    logo?: React.ReactNode;
    noWalletsConnectedText?: React.ReactNode;
    balanceAmount?: number | undefined;
    order: number;
    imgSrc: string;
    displayName?: string | undefined;
    isAvailable: boolean;
    group?: string;
    details?: JSX.Element | JSX.Element[];
    badge?: JSX.Element | JSX.Element[];
    icon?: JSX.Element | JSX.Element[];
    subItems?: ISelectMenuItem[];
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
    menuItemLabel?: React.ReactNode;
    menuItemDetails?: React.ReactNode;
    menuItemImage?: React.ReactNode;
    logo?: React.ReactNode;
    noWalletsConnectedText?: React.ReactNode;
    balanceAmount?: number | undefined;
    imgSrc: string;
    displayName?: string | undefined;
    group?: string;
    isAvailable: boolean;
    details?: JSX.Element | JSX.Element[];
    badge?: JSX.Element | JSX.Element[];
    icon?: JSX.Element | JSX.Element[];
    order?: number;
    subItems?: ISelectMenuItem[];
}
