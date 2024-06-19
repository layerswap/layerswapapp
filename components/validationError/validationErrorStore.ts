import create from 'zustand';

type MessageType = 'error' | 'warning';

interface ValidationErrorState {
    header: string;
    message: string;
    messageType: MessageType;
    setValidationMessage: (header: string, message: string, type: MessageType) => void;
    clearValidationMessage: () => void;
}

const useValidationErrorStore = create<ValidationErrorState>(set => ({
    header: '',
    message: '',
    messageType: 'error',
    setValidationMessage: (header: string, message: string, type: MessageType) => set({ header, message, messageType: type }),
    clearValidationMessage: () => set({ header: '', message: '', messageType: 'error' }),
}));

export default useValidationErrorStore;