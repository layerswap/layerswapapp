"use client";
import { useWindowDimensions as useSharedWindowDimensions } from "@layerswap/utils";
import AppSettings from "../lib/AppSettings";

export default function useWindowDimensions() {
  const { windowSize, isMobile, isDesktop } = useSharedWindowDimensions();

  return {
    windowSize,
    isMobile,
    isMobileWithPortal: isMobile && AppSettings.ThemeData?.enablePortal == true,
    isDesktop
  };
}