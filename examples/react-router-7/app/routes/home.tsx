import type { Route } from "./+types/home";
import { LayerswapWidget } from "../components/LayerswapWidget";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Layerswap Widget - React Router 7" },
    { name: "description", content: "Layerswap widget integration example using React Router 7" },
  ];
}

export default function Home() {
  return <LayerswapWidget />;
}
