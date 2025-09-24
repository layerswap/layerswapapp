import Head from "next/head";

type Props = {
  children: JSX.Element | JSX.Element[];
};


export default function Layout({ children }: Props) {

  return (<>
    <Head>
      <title>Layerswap Example</title>
    </Head>
    {children}
  </>)
}
