import HeaderWithMenu from "../HeaderWithMenu"
import { useRouter } from "next/router"
import { default as Content } from './Content';
import { default as Footer } from './Footer';
import { useCallback, useRef } from "react";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import AppSettings from "../../lib/AppSettings";

type Props = {
   children: JSX.Element | JSX.Element[];
   className?: string;
   hideMenu?: boolean;
}

const Widget = ({ children, className, hideMenu }: Props) => {
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

   return <div className="relative p-px">
      <div className="invisible sm:visible absolute inset-0 rounded-[25px] bg-gradient-to-t from-secondary-800 to-secondary-300 pointer-events-none" />
      <div id="widget" className='md:shadow-lg rounded-3xl w-full sm:overflow-hidden relative bg-gradient-to-b from-secondary-700 to-secondary-700'>
         {
            AppSettings.ApiVersion === 'sandbox' &&
            <div className="relative z-20">
               <div className="absolute sm:top-0 -top-4 right-[calc(50%-68px)] bg-[#D95E1B] py-0.5 px-10 rounded-b-md text-xs scale-75">
                  TESTNET
               </div>
            </div>
         }

         {
            !hideMenu &&
            <HeaderWithMenu goBack={handleBack} />
         }
         <div className="relative px-6">
            <div className="flex items-start" ref={wrapper}>
               <div className={`flex flex-nowrap grow`}>
                  <div className={`w-full pb-6 flex flex-col justify-between text-secondary-text h-full ${className}`}>
                     {children}
                  </div>
               </div>
            </div>
         </div>
         <div id="widget_root" />
      </div>
   </div>
}

Widget.Content = Content
Widget.Footer = Footer

export { Widget }