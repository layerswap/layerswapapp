export class SelectMenuItem {
    id: string;
    name: string;
    imgSrc: string;
    isEnabled: boolean;

    constructor(id: string, name: string, imgSrc: string, isEnabled: boolean = true) {
        this.id = id;
        this.name = name;
        this.imgSrc = imgSrc;
        this.isEnabled = isEnabled;
    }
}
