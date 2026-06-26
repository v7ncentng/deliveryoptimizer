import type { Metadata, Viewport } from "next";
import ServiceWorkerRegistration from "@/app/components/ServiceWorkerRegistration";
import "./globals.css";
import FeedbackLauncher from "./components/FeedbackLauncher";

export const metadata: Metadata = {
  title: {
    default: "Delivery Route Optimizer",
    template: "%s | Delivery Route Optimizer",
  },
  description: "Convert addresses to coordinates with CSV support",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ServiceWorkerRegistration />
        {children}
        <FeedbackLauncher />
      </body>
    </html>
  );
}
