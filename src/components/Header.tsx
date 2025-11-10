"use client";

import styles from "@/styles/Header.module.css";
import { useUser } from "@/context/UserContext";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createLogger } from "@/utils/logger";
import Image from "next/image";


export default function Header() {
  const { user, originalAvatar, setOriginalAvatar } = useUser();
  const router = useRouter();

  const [animating, setAnimating] = useState(false);

  const log = useRef(createLogger("Header")).current;
  const opId = useRef(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    if (user && user.avatar_url && !originalAvatar) {
      setOriginalAvatar(user.avatar_url);
    }
  }, [user, originalAvatar, setOriginalAvatar]);

  useEffect(() => {
    if (user) {
      setAnimating(true);
      const timeout = setTimeout(() => setAnimating(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [user?.balance]);

  const handleLogoClick = () => {
    const currentPath = window.location.pathname;

    log.debug("Logo clicked", {
      op_id: opId,
      user_id: user?.id,
      current_path: currentPath,
    });

    currentPath === "/games"
      ? window.location.replace("/games")
      : router.replace("/games" + window.location.hash);
  };

  return (
    <div className={styles.header}>
      <div className={`${styles.container}`}>
      <div className={styles.logoBlock} onClick={handleLogoClick}>
        <Image src="/assets/Header/logo.svg" alt="Frosty Casino" className={styles.logoImage} width={94} height={23} />
      </div>

      <div className={`${styles.headerRight}`}>
      {user && (
        <div className={`${styles.userCompact}`}>
            <span className={`${styles.userBalance} ${animating ? styles.fade : ""}`}>
              {Math.floor(user.balance || 0).toLocaleString("ru-RU")} ₽
            </span>
            <Image className={`${styles.userCompactIcon}`} src={'/balance-icon.svg'} width={40} height={40} alt="balance-icon" />
        </div>
      )}

      <div className={styles.avatarContainer}>
        <div className={styles.avatarWrap}>
          <img
            src={
              user?.is_hidden
                ? "/assets/Header/profile-oval.svg"
                : user?.avatar_url || originalAvatar || "/assets/Header/profile-oval.svg"
            }
            alt="Аватар пользователя"
            className={styles.incognitoAvatar}
          />
        </div>
      </div>
      </div>
    </div>
    </div>
  );
}
