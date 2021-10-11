import axios from 'axios';
import preval from 'next-plugin-preval';
import { LayerSwapSettings } from '../Models/LayerSwapSettings';
import LayerSwapApiClient from './layerSwapApiClient';

async function getData(): Promise<LayerSwapSettings> {
    const data = await fetchSettingsAsync()

    if (process.env.NODE_ENV == "production") {
        data.networks.forEach((element, index) => {
            if (element.is_test_net) data.networks.splice(index, 1);
        });
    }

    return  data;
}


async function fetchSettingsAsync(): Promise<LayerSwapSettings> {
    return await axios.get(LayerSwapApiClient.apiBaseEndpoint + '/settings').then(res => res.data);
}

export default preval(getData());