import HeaderWithMenu from "../HeaderWithMenu"
import { default as Content } from './Content';
import { default as Footer } from './Footer';
import { useRef } from "react";
import AppSettings from "@/lib/AppSettings";

type Props = {
   children: JSX.Element | JSX.Element[];
   hideMenu?: boolean;
   goBack?: () => void
}

const Widget = ({ children, hideMenu, goBack }: Props) => {
   const wrapper = useRef(null);

   return <div className="relative p-px">
      <div className="invisible sm:visible absolute inset-0 rounded-[25px] bg-gradient-to-t from-secondary-800 to-secondary-300 pointer-events-none" />
      <div id="widget" className='md:shadow-lg rounded-3xl w-full sm:overflow-hidden relative bg-gradient-to-b from-secondary-700 to-secondary-700 max-sm:has-openpicker:min-h-svh sm:has-openpicker:min-h-[79svh] has-openwithdrawalmodal:min-h-[650px] h-full flex flex-col'>
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
            <HeaderWithMenu goBack={goBack} />
         }
         <div className="relative flex flex-col px-4 pb-4 h-full w-full min-h-0" ref={wrapper}>
            {children}
         </div>
         <div id="widget_root" />
      </div>
   </div>
}

Widget.Content = Content
Widget.Footer = Footer

export { Widget }