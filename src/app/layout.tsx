import type { Metadata } from "next";
import "./globals.css";

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
      <body className="h-screen grid grid-rows-[auto_1fr_auto] pt-4">
        {children}
      </body>
    </html>
  );
}
