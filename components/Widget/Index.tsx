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
   contextualMenu?: React.ReactNode;
}

const Widget = ({ children, hideMenu, contextualMenu }: Props) => {
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
      <div id="widget" className='md:shadow-lg sm:pb-4 rounded-3xl w-full sm:overflow-hidden relative bg-gradient-to-b from-secondary-700 to-secondary-700 max-sm:has-openpicker:min-h-svh max-sm:min-h-[99.8svh] sm:has-openpicker:min-h-[79svh] has-openwithdrawalmodal:min-h-[650px] h-full flex flex-col'>
         {
            AppSettings.ApiVersion === 'sandbox' &&
            <div className="relative z-20">
               <div className="absolute -top-1 right-[calc(50%-68px)] bg-[#D95E1B] py-0.5 px-10 rounded-b-md text-xs scale-75">
                  TESTNET
               </div>
            </div>
         }
         {
            !hideMenu &&
            <HeaderWithMenu goBack={handleBack} contextualMenu={contextualMenu} />
         }

         <div className="relative flex-col px-4 h-full min-h-0 flex flex-1">
            <div className="flex flex-col flex-1 items-start h-full min-h-0 w-full" ref={wrapper}>
               {children}
            </div>
         </div>
         <div id="widget_root" />
      </div>
   </div>
}

Widget.Content = Content
Widget.Footer = Footer

export { Widget }