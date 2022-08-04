import { FC } from 'react'
import Swap from './swapComponent';
import { AuthProvider } from '../context/auth';

const App: FC = () => {

    return <>
        <AuthProvider>
            <div className={`bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative`}>
                <div>
                    <Swap />
                </div>
            </div>
        </AuthProvider>
    </>
}

export default App;