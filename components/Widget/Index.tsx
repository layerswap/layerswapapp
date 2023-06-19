import HeaderWithMenu from "../HeaderWithMenu"
import { useRouter } from "next/router"
import { default as Content } from './Content';
import { default as Footer } from './Footer';
import { useRef } from "react";

const Widget = ({ children, className }: { children: JSX.Element | JSX.Element[], className?: string}) => {
   const router = useRouter()
   const wrapper = useRef(null);

   const goBack = window?.['navigation']?.['canGoBack'] ?
      () => router.back()
      : () => router.push("/")

   const handleBack = router.pathname === "/" ? null : goBack

   return <>
      <div className={`bg-secondary-900 md:shadow-card rounded-lg w-full sm:overflow-hidden relative`}>
         <div className="relative">
            <div className="overflow-hidden h-1 flex rounded-t-lg bg-secondary-500">
               <div className="shadow-none flex flex-col whitespace-nowrap justify-center bg-primary"></div>
            </div>
         </div>
         <HeaderWithMenu goBack={handleBack} />
         <div className='text-center text-xl text-secondary-100'>
         </div>
         <div className="relative px-6">
            <div className="flex items-start" ref={wrapper}>
               <div className={`flex flex-nowrap grow`}>
                  <div className={`w-full pb-6 flex flex-col justify-between h-full space-y-5 text-primary-text ${className}`}>
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