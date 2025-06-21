import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Actitud",
  description: "Actitud Backoffice",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content="Actitud" />
      </head>
      <body className="h-screen grid grid-rows-[auto_1fr_auto]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
