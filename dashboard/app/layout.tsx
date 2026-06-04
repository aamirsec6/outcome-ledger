import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { isClerkEnabled } from "@/lib/clerk-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outcome Ledger",
  description: "Cost per accepted outcome — AI spend tied to real wins",
};

const themeScript = `(function(){try{var t=localStorage.getItem('outcome-ledger-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const body = (
    <html lang="en" suppressHydrationWarning data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );

  if (isClerkEnabled()) {
    return <ClerkProvider afterSignOutUrl="/sign-in">{body}</ClerkProvider>;
  }

  return body;
}
