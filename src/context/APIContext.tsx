"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { SkylonAPIClient } from "@/utils/skylon_api_client";

interface APIContextType {
  client: SkylonAPIClient | null;
}

const APIContext = createContext<APIContextType | undefined>(undefined);

export function APIProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<SkylonAPIClient | null>(null);

  useEffect(() => {
    const init = async () => {
      const { default: WebApp } = await import("@twa-dev/sdk");
      setClient(new SkylonAPIClient(WebApp.initData));
    };
    init();
  }, []);

  return (
    <APIContext.Provider value={{ client }}>
      {children}
    </APIContext.Provider>
  );
}

export function useAPI(): APIContextType {
  const ctx = useContext(APIContext);
  if (!ctx) throw new Error("useAPI must be used within an APIProvider");
  return ctx;
}
