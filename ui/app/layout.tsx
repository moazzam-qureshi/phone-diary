import type { Metadata } from "next";
import { Caveat, Quicksand } from "next/font/google";
import "./globals.css";
import ForestBackdrop from "@/app/components/ForestBackdrop";
import AudioController from "@/app/components/AudioController";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "ANALOG LIFE LOG",
  description: "reality recording device",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover" as const,
  themeColor: "#1a2e22",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${quicksand.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="font-sans">
        <ForestBackdrop />
        {children}
        <AudioController />
      </body>
    </html>
  );
}
