import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getAppSettings } from "@/lib/settings/AppSettingsLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  const siteName = settings.company_name || "Decision Intelligence Platform";
  const logoUrl = settings.logo_url ?? '/images/PlatformBrandingLogo.png';

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
    title: siteName,
    description: "DIP — Convert client feedback into business decisions",
    icons: {
      icon: logoUrl,
      apple: logoUrl,
      shortcut: logoUrl,
    },
    openGraph: {
      title: siteName,
      description: "DIP — Convert client feedback into business decisions",
      images: [logoUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
