import HeaderWithMenu from "../HeaderWithMenu"
import { default as Content } from './Content';
import { default as Footer } from './Footer';
import { useCallback, useRef } from "react";
import AppSettings from "../../lib/AppSettings";

type Props = {
   children: JSX.Element | JSX.Element[];
   className?: string;
   hideMenu?: boolean;
}

const Widget = ({ children, className, hideMenu }: Props) => {
   const wrapper = useRef(null);

   const goBack = useCallback(() => {
      // window?.['navigation']?.['canGoBack'] ?
      //    router.back()
      //    : router.push({
      //       pathname: "/",
      //       query: resolvePersistantQueryParams(router.query)
      //    })
   }, [])


   const handleBack = null

   return <>
      <div id="widget" className={`bg-secondary-900 md:shadow-card rounded-lg w-full sm:overflow-hidden relative `}>
         <div className="relative z-20">
            {
               AppSettings.ApiVersion === 'sandbox' &&
               <div>
                  <div className="h-0.5 bg-[#D95E1B]" />
                  <div className="absolute -top-0.5 right-[calc(50%-68px)] bg-[#D95E1B] py-0.5 px-10 rounded-b-md text-xs scale-75">
                     TESTNET
                  </div>
               </div>
            }
         </div>
         {
            !hideMenu &&
            <HeaderWithMenu goBack={handleBack} />
         }
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