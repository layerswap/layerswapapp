import { HomeComponent } from '@/components/HomeComponent';
import "@layerswap/widget/index.css"
import { ThemeProvider } from "@/context/ThemeContext";
import "@/styles/globals.css";

export default function Home() {
    return (
        <ThemeProvider>
            <HomeComponent />
        </ThemeProvider>
    );
}