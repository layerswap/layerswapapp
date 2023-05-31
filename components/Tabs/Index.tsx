import { WithdrawType } from '../../lib/layerSwapApiClient';

export {default as TabHeader} from './Header';

export type Tab = {
    id: WithdrawType,
    enabled: boolean,
    label: string,
    icon: JSX.Element | JSX.Element[],
    content: any,
    footer?: JSX.Element | JSX.Element[],
}