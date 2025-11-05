import React from "react";
import Lottie from "lottie-react";
import animationData from "@/../public/lottie/loading.json";
import styles from "@/styles/BrandedLoading.module.css";
import skins from "@/styles/skins.module.css";

export default function BrandedLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={`${styles.container} ${skins.containerSkin} ${skins.containerWithPattern }`}>
        <div className={styles.animation}>
          <Lottie
            animationData={animationData}
            loop
            autoplay
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <p className={styles.loadingText}>Загрузка...</p>
      </div>
    </div>
  );
}
