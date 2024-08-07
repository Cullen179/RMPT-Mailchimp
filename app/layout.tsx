import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RMIT Mailchimp",
  description: "RMIT Mailchimp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} + "min-h-screen bg-background font-sans antialiased py-10 px-20 dark "`}>{children}</body>
    </html>
  );
}
