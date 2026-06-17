import { NetworkType } from '@/Models/Network';
import { AddressSelectionMode } from './types';
import { validators } from './providers';

export { AddressSelectionMode } from './types';
export type { AddressValidator } from './types';
export { validators } from './providers';

export function AddressTypeLabel(type: NetworkType): string {
    return validators.find(v => v.type === type)?.label ?? type;
}

export function AddressSelectionType(type: NetworkType): AddressSelectionMode | undefined {
    return validators.find(v => v.type === type)?.selection;
}

/** Default selection for a `Networks`-mode address among `candidates` (already scoped to type/availability).
 *  `defaultScope: 'primary'` => the primary subset when present; otherwise all candidates. */
export function defaultNetworkScope(type: NetworkType, candidates: { name: string; type: NetworkType }[]): string[] {
    if (validators.find(v => v.type === type)?.defaultScope === 'primary') {
        const typeName = String(type).toLowerCase();
        const primaries = candidates
            .filter(n => n.type === type && n.name.split('_')[0].toLowerCase() === typeName)
            .map(n => n.name);
        if (primaries.length) return primaries;
    }
    return candidates.map(n => n.name);
}

export function classifyAddress(address: string): { types: NetworkType[]; selection: AddressSelectionMode | 'none' } {
    const a = (address ?? '').trim();
    const matched = a ? validators.filter(v => v.validate(a)) : [];
    if (!matched.length) return { types: [], selection: 'none' };

    const types = matched.map(v => v.type);

    if (types.length > 1) return { types, selection: AddressSelectionMode.Overlap };
    return { types, selection: matched[0].selection };
}
