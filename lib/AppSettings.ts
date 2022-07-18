enum configConstans { BransferApi = "BRANSFER_API", LayerswapApi =  "LAYERSWAP_API", IdentityApi =  "IDENTITY_API" }

export default class AppSettings {
    static LayerswapApiUri: string = process.env[configConstans.LayerswapApi];
    static BransferApiUri: string = process.env[configConstans.BransferApi];
    static IdentityApiUri: string = process.env[configConstans.IdentityApi];
}

