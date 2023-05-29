export {default as TabHeader} from './Header';

export type Tab = {
    id: string,
    enabled: boolean,
    label: string,
    icon: JSX.Element | JSX.Element[],
    content: any,
    footer?: JSX.Element | JSX.Element[],
}