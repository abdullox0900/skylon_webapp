"use client";

import styles from "@/styles/Header.module.css";
import skins from "@/styles/skins.module.css";
import { useUser } from "@/context/UserContext";
import { useAPI } from "@/context/APIContext";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createLogger } from "@/utils/logger";
import Image from "next/image";


export default function Header() {
  const { user, setUser, originalAvatar, setOriginalAvatar, setProfileChanged } = useUser();
  const { client } = useAPI();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
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
  }, [user?.is_hidden]);

  const handleToggleName = async () => {
    if (!user || !client) return;
    setLoading(true);

    log.info("Toggle incognito mode", {
      op_id: opId,
      user_id: user.id,
      current_status: user.is_hidden,
      action: user.is_hidden ? "disable" : "enable",
    });

    try {
      const updatedUser = await client.updateUserHiddenStatus(user.id, !user.is_hidden);
      if (!updatedUser.is_hidden && originalAvatar) {
        updatedUser.avatar_url = originalAvatar;
      }
      setUser(updatedUser);
      setProfileChanged(true);

      log.info("Incognito mode updated successfully", {
        op_id: opId,
        user_id: user.id,
        new_status: updatedUser.is_hidden,
      });
    } catch (err) {
      log.error("Failed to update is_hidden status", {
        op_id: opId,
        user_id: user.id,
        error: String(err),
      });
    } finally {
      setLoading(false);
    }
  };

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

      <button
        className={`${styles.incognitoBtn} ${user?.is_hidden ? styles.active : ""}`}
        onClick={(e) => {
          const btn = e.currentTarget;
          btn.classList.remove(styles.spring);
          void btn.offsetWidth;
          btn.classList.add(styles.spring);

          setTimeout(() => {
            btn.classList.remove(styles.spring);
          }, 310);

          handleToggleName();
        }}
        disabled={loading}
        title="Переключить отображение имени"
      >
        <img
          src={
            user?.is_hidden
              ? "/assets/Header/profile-oval.svg"
              :  user?.avatar_url || originalAvatar || "/assets/Header/profile-oval.svg"
          }
          alt="Инкогнито"
          className={styles.incognitoAvatar}
        />

        <img src="/assets/right-arrow.svg" alt="" />
      </button>
      </div>
    </div>
    </div>
  );
}
