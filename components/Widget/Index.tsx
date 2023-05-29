import HeaderWithMenu from "../HeaderWithMenu"
import { useRouter } from "next/router"
import { default as Content } from './Content';
import { default as Footer } from './Footer';
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
let variants = {
   enter: ({ direction, width }) => ({
      x: direction * width,
   }),
   center: {
      x: 0,
      transition: {
         when: "beforeChildren",
      },
   },
   exit: ({ direction, width }) => ({
      x: direction * -width,
   }),
};
const Widget = ({ children }) => {
   const [wrapperWidth, setWrapperWidth] = useState(1);
   const router = useRouter()
   const wrapper = useRef(null);
   useEffect(() => {
      function handleResize() {
         if (wrapper.current !== null) {
            setWrapperWidth(wrapper.current.offsetWidth);
         }
      }
      window.addEventListener("resize", handleResize);
      handleResize();

      return () => window.removeEventListener("resize", handleResize);
   }, []);

   const handleBack = window?.['navigation']?.['canGoBack'] ?
      () => router.back()
      : () => router.push("/")

   return <>
      <div className={`bg-darkblue-900 md:shadow-card rounded-lg w-full sm:overflow-hidden relative`}>
         <div className="relative">
            <div className="overflow-hidden h-1 flex rounded-t-lg bg-darkblue-500">
               <div className="shadow-none flex flex-col whitespace-nowrap justify-center bg-primary"></div>
            </div>
         </div>
         <HeaderWithMenu goBack={handleBack} />
         <div className='text-center text-xl text-darkblue-100'>
         </div>
         <div className="relative px-6">
            <div className="flex items-start" ref={wrapper}>
               <div className={`flex flex-nowrap grow`}>
                  <div className="w-full pb-6 flex flex-col justify-between h-full space-y-5 text-primary-text">
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