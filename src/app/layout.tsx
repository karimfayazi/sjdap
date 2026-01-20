import type { Metadata, Viewport } from "next";
import "./globals.css";
import MasterLayout from "@/components/MasterLayout";
import ServiceWorkerRegistration from "./sw-register";

export const metadata: Metadata = {
  title: "SJDA - Silver Jubilee Development Agency",
  description: "SJDA - Silver Jubilee Development Agency",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SJDA",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0b4d2b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0b4d2b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SJDA" />
      </head>
      {/* suppressHydrationWarning prevents hydration mismatch warnings from browser extensions 
          (e.g., Grammarly) that inject attributes into the DOM before React hydrates */}
      <body 
        suppressHydrationWarning 
        className="antialiased h-full flex flex-col overflow-hidden" 
        style={{ fontFamily: 'Calibri, "Segoe UI", Arial, Helvetica, sans-serif' }}
      >
        <ServiceWorkerRegistration />
        <MasterLayout>
          {children}
        </MasterLayout>
      </body>
    </html>
  );
}
