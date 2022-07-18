enum configConstans { "BRANSFER_API", "LAYERSWAP_API", "IDENTITY_API" }

export default class AppSettings {
    static LayerswapApiUri: string = process.env[configConstans.LAYERSWAP_API];
    static BransferApiUri: string = process.env[configConstans.BRANSFER_API];
    static IdentityApiUri: string = process.env[configConstans.IDENTITY_API];
}

