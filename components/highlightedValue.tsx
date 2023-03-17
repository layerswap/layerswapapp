import Image from "next/image"
import { useSettingsState } from "../context/settings"

type HighlightedValueProps = {
    int_name: string;
    disp_name: string;
    type?: 'network' | 'currency'
}

const HighlightedValue = ({ int_name, disp_name, type = 'network' }: HighlightedValueProps) => {
    const settings = useSettingsState()

    return (
        <span className='inline-block m-1'>
            <span className='flex items-center gap-1 py-1 bg-slate-700 rounded-sm px-2 text-sm'>
                <Image src={`${settings.discovery.resource_storage_url}/layerswap/${type === 'network' ? 'networks' : 'currencies'}/${int_name.toLowerCase()}.png`}
                    alt="Project Logo"
                    height="15"
                    width="15"
                    className='rounded-sm'
                />
                <span className="text-white">{disp_name}</span>
            </span>
        </span>
    )
}

export default HighlightedValue