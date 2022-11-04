import { FC, useEffect, useRef } from 'react'
import inIframe from '../utils/inIframe';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import { AnimatePresence } from 'framer-motion';
import HeaderWithMenu from '../HeaderWithMenu';

type Props = {
   children: JSX.Element | JSX.Element[];
}

const Wizard: FC<Props> = ({ children }) => {

   const wrapper = useRef(null);

   const { setWrapperWidth, setWrapperHeight } = useFormWizardaUpdate()
   const { height } = useWindowDimensions();
   const { wrapperWidth, positionPercent, moving, goBack } = useFormWizardState()
   
   useEffect(() => {
      if (inIframe()) {
         const wrapperCurrentHeight = wrapper?.current?.offsetHeight
         const calculatedHeight = height - wrapper?.current?.getBoundingClientRect()?.top
         if (calculatedHeight > wrapperCurrentHeight)
            setWrapperHeight(`${calculatedHeight}px`)
         else
            setWrapperHeight('100%')
      }
      else setWrapperHeight('100%')
   }, [height])

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

   const width = positionPercent || 0
   return <>
      <div className={`bg-darkblue shadow-card rounded-lg w-full overflow-hidden relative`}>
         <div className="relative">
            <div className="overflow-hidden h-1 flex rounded-t-lg bg-darkblue-500">
               <div style={{ width: `${width}%`, transition: 'width 1s' }} className="shadow-none flex flex-col whitespace-nowrap justify-center bg-primary"></div>
            </div>
         </div>
         <HeaderWithMenu goBack={goBack}/>
         <div className='text-center text-xl text-darkblue-50'>

         </div>
         <div className="relative px-6 md:px-8">
            <div className="flex items-start"
               ref={wrapper}>
               <AnimatePresence initial={false} custom={{ direction: moving === "forward" ? 1 : -1, width: wrapperWidth }}>
                  <div className={`flex flex-nowrap`}>
                     {children}
                  </div>
               </AnimatePresence>
            </div>
         </div>
      </div>
   </>
}

export default Wizard;