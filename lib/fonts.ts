import { Inter, Lora, Roboto_Mono, Poppins, Nunito, Playfair_Display } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const lora = Lora({ subsets: ["latin"], preload: false, variable: "--font-lora", display: "swap" });
const mono = Roboto_Mono({ subsets: ["latin"], preload: false, variable: "--font-roboto-mono", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "700"], preload: false, variable: "--font-poppins", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], preload: false, variable: "--font-nunito", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], preload: false, variable: "--font-playfair", display: "swap" });
export const fontVariables = [inter.variable, lora.variable, mono.variable, poppins.variable, nunito.variable, playfair.variable].join(" ");
