import create from 'zustand';

type MessageType = 'error' | 'warning';

interface ValidationErrorState {
    header: string;
    message: string;
    messageType: MessageType;
    directions: string[],
    setValidationMessage: (header: string, message: string, type: MessageType, direction: string) => void;
    clearValidationMessage: () => void;
}

const useValidationErrorStore = create<ValidationErrorState>(set => ({
    header: '',
    message: '',
    messageType: 'error',
    directions: [],
    setValidationMessage: (header, message, type, direction) => set((state) => ({
        header, message, messageType: type, directions: [
            ...state.directions.filter(d => d !== direction),
            direction
        ]
    })),
    clearValidationMessage: () => set({ header: '', message: '', messageType: 'error', directions: [] }),
}));

export default useValidationErrorStore;