import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NameGraph",
  description: "ENS-named agents that pay to query The Graph",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
