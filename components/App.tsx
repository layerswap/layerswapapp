import { FC } from 'react'
import { AuthProvider } from '../context/authContext';
import Swap from './swapComponent';

const App: FC = () => {

    return <AuthProvider>
        <div className={`bg-darkblue-900 shadow-card rounded-lg w-full overflow-hidden relative`}>
            <div>
                <Swap />
            </div>
        </div>
    </AuthProvider>
}

export default App;