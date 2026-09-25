"use client";
import HeaderWithMenu from "../HeaderWithMenu"
import type { JSX } from 'react';
import { default as Content } from './Content';
import { default as Footer } from './Footer';
import AppSettings from "@/lib/AppSettings";
import { WidgetFrame } from "./WidgetFrame";
import { useSettingsState } from "@/exports";

type Props = {
   children: JSX.Element | JSX.Element[];
   hideMenu?: boolean;
   goBack?: () => void;
   contextualMenu?: React.ReactNode;
   fitHeight?: boolean;
}

const Widget = ({ children, hideMenu, goBack, contextualMenu, fitHeight = false }: Props) => {
   const { isEmbedded } = useSettingsState()

   return <WidgetFrame
      enableWideVersion={AppSettings.ThemeData?.enableWideVersion}
      isEmbedded={isEmbedded}
      fitHeight={fitHeight}
      backgroundStyle={AppSettings.ThemeData?.cardBackgroundStyle}
      testnet={AppSettings.ApiVersion === 'testnet'}
      header={!hideMenu && <HeaderWithMenu goBack={goBack} contextualMenu={contextualMenu} />}
   >
      {children}
   </WidgetFrame>
}

Widget.Content = Content
Widget.Footer = Footer

export { Widget }