import { Token } from "@/Models/Network";

export const insertIfNotExists = (arr: Token[], item: Token | undefined): Token[] => !item || arr.some(el => el.symbol === item.symbol) ? arr : [...arr, item]