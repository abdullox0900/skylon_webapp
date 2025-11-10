import "@/styles/global.css";
import { APIProvider } from "@/context/APIContext";
import AppInit from "@/components/AppInit";
import { UserProvider } from "@/context/UserContext";
import { Onest } from "next/font/google";
import { createLogger } from "@/utils/logger";

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});



const log = createLogger("RootLayout");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const opId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

  log.info("RootLayout initialized", {
    op_id: opId,
    lang: "ru",
    font: "Onest",
    env: process.env.NODE_ENV,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "server",
  });

  return (
    <html lang="ru" className={onest.className}>
      <body>
        <APIProvider>
          <UserProvider>
              <AppInit>
              {children}
              </AppInit>
          </UserProvider>
        </APIProvider>
      </body>
    </html>
  );
}
