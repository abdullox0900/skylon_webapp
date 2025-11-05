"use client";

import { createContext, useContext, useState } from "react";
import type { ParsedUser } from "@/types/api_client";

interface UserContextType {
  user: ParsedUser | null;
  setUser: (user: ParsedUser) => void;
  originalAvatar: string | null;
  setOriginalAvatar: (avatar: string | null) => void;
  profileChanged: boolean;
  setProfileChanged: (changed: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ParsedUser | null>(null);
  const [originalAvatar, setOriginalAvatar] = useState<string | null>(null);
  const [profileChanged, setProfileChanged] = useState<boolean>(false);

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        originalAvatar,
        setOriginalAvatar,
        profileChanged,
        setProfileChanged,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
