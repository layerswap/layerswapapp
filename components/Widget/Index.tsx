import HeaderWithMenu from "../HeaderWithMenu"
import { useRouter } from "next/router"
import { default as Content } from './Content';
import { default as Footer } from './Footer';
import { useCallback, useRef } from "react";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";

const Widget = ({ children, className }: { children: JSX.Element | JSX.Element[], className?: string }) => {
   const router = useRouter()
   const wrapper = useRef(null);

   const goBack = useCallback(() => {
      window?.['navigation']?.['canGoBack'] ?
         router.back()
         : router.push({
            pathname: "/",
            query: resolvePersistantQueryParams(router.query)
         })
   }, [])


   const handleBack = router.pathname === "/" ? null : goBack

   return <>
      <div className={`bg-secondary-900 md:shadow-card rounded-lg w-full sm:overflow-hidden relative`}>
         <div className="relative">
            {
               LayerSwapApiClient.apiVersion === 'sandbox' && <div>
                  <div className="h-0.5 bg-[#D95E1B]" />
                  <div className="absolute top-0.5 right-[calc(50%-68px)] bg-[#D95E1B] py-0.5 px-10 rounded-b-md text-xs scale-75">
                     TESTNET
                  </div>
               </div>
            }
         </div>
         <HeaderWithMenu goBack={handleBack} />
         <div className='text-center text-xl text-secondary-100'>
         </div>
         <div className="relative px-6">
            <div className="flex items-start" ref={wrapper}>
               <div className={`flex flex-nowrap grow`}>
                  <div className={`w-full pb-6 flex flex-col justify-between space-y-5 text-secondary-text h-full ${className}`}>
                     {children}
                  </div>
               </div>
            </div>
         </div>
         <div id="widget_root" />
      </div>
   </>
}

Widget.Content = Content
Widget.Footer = Footer

export { Widget }