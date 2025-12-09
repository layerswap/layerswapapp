"use client";
import HeaderWithMenu from "../HeaderWithMenu"
import { default as Content } from './Content';
import { default as Footer } from './Footer';
import { useRef } from "react";
import AppSettings from "@/lib/AppSettings";
import clsx from "clsx";

type Props = {
   children: JSX.Element | JSX.Element[];
   hideMenu?: boolean;
   goBack?: () => void;
   contextualMenu?: React.ReactNode;

}

const Widget = ({ children, hideMenu, goBack, contextualMenu }: Props) => {
   const wrapper = useRef(null);

   return <div className="relative p-px h-full">
      {
         AppSettings.ThemeData?.enableWideVersion &&
         <div className="invisible sm:visible absolute inset-0 rounded-[25px] bg-linear-to-t from-secondary-800 to-secondary-300 pointer-events-none" />
      }
      <div
         id="widget"
         style={AppSettings.ThemeData?.cardBackgroundStyle}
         className={clsx("sm:pb-4 rounded-3xl w-full overflow-hidden relative bg-secondary-700 h-full flex flex-col has-expandContainerHeight:min-h-[650px]", {
            "max-sm:has-openpicker:min-h-svh max-sm:min-h-[99.8svh] sm:has-openpicker:min-h-[79svh]": AppSettings.ThemeData?.enableWideVersion,
            "has-openpicker:min-h-[650px]": !AppSettings.ThemeData?.enableWideVersion
         })}
      >
         {
            AppSettings.ApiVersion === 'testnet' &&
            <div className="relative z-20">
               <div className="absolute -top-1 right-[calc(50%-68px)] bg-warning-foreground py-0.5 px-10 rounded-b-md text-xs scale-75">
                  TESTNET
               </div>
            </div>
         }
         {
            !hideMenu &&
            <HeaderWithMenu goBack={goBack} contextualMenu={contextualMenu} />
         }

         <div className="relative flex-col px-4 h-full min-h-0 flex flex-1">
            <div className="flex flex-col flex-1 items-start h-full min-h-0 w-full gap-3" ref={wrapper}>
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