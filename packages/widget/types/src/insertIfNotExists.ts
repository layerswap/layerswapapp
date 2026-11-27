import { LayerswapToken } from "./types";

export const insertIfNotExists = <Token extends LayerswapToken>(arr: Token[], item: Token | undefined): Token[] => !item || arr.some(el => el.symbol === item.symbol) ? arr : [...arr, item]
