import Head from "next/head";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};


export default function Layout({ children }: Props) {

  return (<>
    <Head>
      <title>Layerswap Example</title>
    </Head>
    {children}
  </>)
}
