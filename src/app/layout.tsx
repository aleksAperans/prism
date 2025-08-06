import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import NextAuthSessionProvider from "@/components/common/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DynamicBreadcrumb } from "@/components/common/DynamicBreadcrumb";
import { BreadcrumbProvider } from "@/components/providers/BreadcrumbProvider";
import { RiskProfileProvider } from "@/contexts/RiskProfileContext";
import { BatchUploadProvider } from "@/contexts/BatchUploadContext";
import { GlobalBatchUploadPanel } from "@/components/common/GlobalBatchUploadPanel";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Prism",
  description: "Transform complex entity data into clear, actionable insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextAuthSessionProvider>
            <RiskProfileProvider>
              <BatchUploadProvider>
                <BreadcrumbProvider>
                    <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
                  <div className="flex items-center gap-3 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <div className="h-6 w-px bg-border" />
                    <DynamicBreadcrumb />
                  </div>
                </header>
                <main className="flex-1">
                  <div className="container mx-auto py-6 px-4 lg:px-6">
                    {children}
                  </div>
                </main>
              </SidebarInset>
              {/* Global Batch Upload Panel */}
              <GlobalBatchUploadPanel />
                    </SidebarProvider>
                  </BreadcrumbProvider>
                </BatchUploadProvider>
            </RiskProfileProvider>
          </NextAuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
