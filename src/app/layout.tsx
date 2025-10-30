import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import dynamic from "next/dynamic";
import IncomingCallListener from "@/components/IncomingCallListener";

const StreamBootstrapper = dynamic(() => import("@/components/StreamBootstrapper"), { ssr: false });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Skillify - Skill Sharing Platform",
  description: "Share skills and learn from others",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
          rel="stylesheet"
        />
      </head>
      <body className={inter.className + " bg-gray-50 min-h-screen flex flex-col"}>
        <ClerkProvider>
          <StreamBootstrapper />
          <IncomingCallListener />
          <Navbar />
          <div className="flex-grow">
            {children}
          </div>
          <Footer />
          <Toaster position="top-center" />
        </ClerkProvider>
      </body>
    </html>
  );
}
