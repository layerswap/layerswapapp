import LayerSwapApiClient from "../lib/layerSwapApiClient";
import { getThemeData } from "./settingsHelper";

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    const apiClient = new LayerSwapApiClient()
    const { data } = await apiClient.GetLSNetworksAsync()
  
    if (!data) return
  
    const settings = {
      networks: data,
      exchanges: [],
    }
  
    const themeData = await getThemeData(context.query)

    return {
        props: { settings, themeData }
    }
}