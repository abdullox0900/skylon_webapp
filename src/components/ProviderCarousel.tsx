"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/styles/ProviderCarousel.module.css";
import { useAPI } from "@/context/APIContext";
import { useUser } from "@/context/UserContext";
import type { GameProvider } from "@/types/api_client";
import skins from "@/styles/skins.module.css";
import { createLogger } from "@/utils/logger";

function checkImageExists(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

export default function ProviderCarousel() {
  const { client } = useAPI();
  const { user } = useUser();
  const router = useRouter();
  const [validProviders, setValidProviders] = useState<GameProvider[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const log = useRef(createLogger("ProviderCarousel")).current;
  const opId = useRef(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    const fetchProviders = async () => {
      if (!client || !user?.id) return;

      log.info("Fetching providers list", { op_id: opId, user_id: user.id });

      try {
        const data = await client.getProviders(user.id);
        log.debug("Providers fetched", { op_id: opId, total: data.length, user_id: user.id });

        const filtered = await Promise.all(
          data.map(async (provider) => {
            const url = provider.image_url;
            const isValid = url && (await checkImageExists(url));
            if (!isValid) {
              log.warn("Provider skipped due to invalid image", { op_id: opId, provider: provider.provider });
            }
            return isValid ? provider : null;
          })
        );

        const finalList = filtered.filter(Boolean) as GameProvider[];
        setValidProviders(finalList);

        log.info("Providers list ready", {
          op_id: opId,
          total_after_filter: finalList.length,
          user_id: user.id,
        });
      } catch (error) {
        log.error("Failed to load providers", { op_id: opId, error: String(error), user_id: user.id });
      }
    };

    fetchProviders();
  }, [client, user?.id]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
    log.debug("Carousel scrolled", { op_id: opId, direction });
  };

  const handleClick = (provider: string) => {
    log.info("Provider clicked", { op_id: opId, provider });
    router.push(`/games?provider=${provider}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={`${styles.container} ${skins.containerSkin} ${skins.containerWithPattern}`}>
      <div className={styles.header}>
        <span className={styles.title}>
          <img src="/assets/ProviderCarusel/provider_icon.svg" alt="" className={styles.icon} />
          Провайдеры
        </span>
        <div className={styles.controls}>
          <button onClick={() => scroll("left")}>
            <img src="/assets/ProviderCarusel/provider_arrow.svg" alt="left" className={`${styles.arrow} ${styles.leftArrow}`} />
          </button>
          <button onClick={() => scroll("right")}>
            <img src="/assets/ProviderCarusel/provider_arrow.svg" alt="right" className={styles.arrow} />
          </button>
        </div>
      </div>

      <div className={styles.carousel} ref={scrollRef}>
        {[...validProviders, ...validProviders].map((provider, index) => (
          <div
            key={`${provider.provider}-${index}`}
            className={`${styles.item} ${skins.darkblueSkin}`}
            onClick={() => handleClick(provider.provider)}
          >
            <img
              src={typeof provider.image_url === "string" ? provider.image_url : undefined}
              alt={provider.label || provider.provider}
              className={styles.image}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}