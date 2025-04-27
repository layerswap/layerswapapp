// import { THEME, TonConnectUIProvider } from "@tonconnect/ui-react"
// import { ThemeData } from "../../../Models/Theme";

// const TonConnectProvider = ({ children, themeData }: { children: JSX.Element | JSX.Element[], themeData: ThemeData }) => {

//     const rgbToHex = (rgb: string) => {
//         const rgbArray = rgb.match(/\d+/g)
//         function componentToHex(c: number) {
//             var hex = c?.toString(16);
//             return hex.length == 1 ? "0" + hex : hex;
//         }

//         if (!rgbArray) return

//         return "#" + componentToHex(Number(rgbArray[0])) + componentToHex(Number(rgbArray[1])) + componentToHex(Number(rgbArray[2]));
//     }

//     return (
//         <TonConnectUIProvider
//             uiPreferences={
//                 {
//                     theme: THEME.DARK,
//                     borderRadius: 's',
//                     colorsSet: {
//                         [THEME.DARK]: {
//                             constant: {
//                                 black: '#000000',
//                                 white: '#f1f1f1f1',
//                             },
//                             connectButton: {
//                                 background: rgbToHex(themeData.primary?.[500]),
//                                 foreground: rgbToHex(themeData?.secondary?.[800] || ''),
//                             },
//                             accent: rgbToHex(themeData.primary?.[500]),
//                             telegramButton: rgbToHex(themeData.primary?.[500]),
//                             icon: {
//                                 primary: rgbToHex(themeData.primary?.[500]),
//                                 secondary: rgbToHex(themeData?.secondary?.text || ''),
//                                 tertiary: rgbToHex(themeData.secondary?.[400] || ''),
//                                 success: rgbToHex(themeData.primary?.[500]),
//                             },
//                             background: {
//                                 primary: rgbToHex(themeData.secondary?.[900] || ''),
//                                 secondary: rgbToHex(themeData.secondary?.[800] || ''),
//                                 segment: rgbToHex(themeData.secondary?.[200] || ''),
//                                 tint: rgbToHex(themeData.secondary?.[700] || ''),
//                                 qr: '#f1f1f1f1',
//                             },
//                             text: {
//                                 primary: rgbToHex(themeData.primary.text),
//                                 secondary: rgbToHex(themeData?.secondary?.text || ''),
//                             }
//                         }
//                     }
//                 }
//             }
//             manifestUrl={`https://layerswap.io/app/tonconnect-manifest.json`}
//         >
//             {children}
//         </TonConnectUIProvider>
//     )
// }

// export default TonConnectProvider