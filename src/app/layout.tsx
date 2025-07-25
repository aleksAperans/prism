import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import NextAuthSessionProvider from "@/components/common/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DynamicBreadcrumb } from "@/components/common/DynamicBreadcrumb";
import { BreadcrumbProvider } from "@/components/providers/BreadcrumbProvider";

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
            <BreadcrumbProvider>
              <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                  <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                  </div>
                </header>
                <div className="flex flex-1 flex-col">
                  <div className="flex-1">
                    <div className="container mx-auto py-6 px-4 lg:px-6">
                      <DynamicBreadcrumb />
                      {children}
                    </div>
                  </div>
                </div>
              </SidebarInset>
              </SidebarProvider>
            </BreadcrumbProvider>
          </NextAuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
