import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRACKSEG — RUCNet Diagnostic System",
  description: "Structural crack detection via semantic segmentation — RUCNet on CrackSeg9k",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
