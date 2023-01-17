import { FC } from 'react'
import Swap from './swapComponent';

const App: FC = () => {

    return <>
        <div className={`bg-darkblue shadow-card rounded-lg w-full overflow-hidden relative`}>
            <div>
                <Swap />
            </div>
        </div>
    </>
}

export default App;