import { useCallbacks } from '@/context/callbackProvider';
import { ErrorHandler } from '@/lib/ErrorHandler';
import { FC, useCallback, useEffect } from 'react';
import { useIntercom } from 'react-use-intercom';
import { NotFoundView } from './Presentation/NotFoundView';

const NotFound: FC<{ swapId?: string | undefined }> = ({ swapId }) => {
    const { boot, show, update } = useIntercom();
    const updateWithProps = () =>
        update({ customAttributes: { swapId: swapId } });
    const { onBackClick } = useCallbacks();

    useEffect(() => {
        const error = new Error(`Swap not found: ${swapId}`);
        ErrorHandler({
            type: 'NotFound',
            message: error.message,
            name: error.name,
            stack: error.stack,
            cause: error.cause,
        });
    }, [swapId]);

    const startIntercom = useCallback(() => {
        boot();
        show();
        updateWithProps();
    }, [boot, show, updateWithProps]);

    return (
        <NotFoundView startIntercom={startIntercom} onBackClick={onBackClick} />
    );
};
export default NotFound;
