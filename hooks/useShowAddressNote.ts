import { useEffect } from 'react';
import { usePersistedState } from './usePersistedState';
import { useQueryState } from '@/context/query';

export default function useShowAddressNote(): boolean | undefined {
    const [showAddressNote, setShowAddressNote] = usePersistedState('', 'showAddressNote', 'sessionStorage');
    const { destination_address } = useQueryState()

    useEffect(() => {
        if (showAddressNote == 'false') return
        if (destination_address === undefined) {
            setShowAddressNote('false');
        }
        else if (destination_address) {
            setShowAddressNote('true');
        }
    }, [destination_address, showAddressNote])

    const showAddressNoteValue = showAddressNote === 'true' ? true : showAddressNote === 'false' ? false : undefined;

    return showAddressNoteValue;
}
