import React from "react";
import Lottie from "lottie-react";
import animationData from "@/../public/lottie/chip.json";
import animationDataLogo from "@/../public/lottie/logo.json";
import styles from "@/styles/BrandedLoading.module.css";

export default function BrandedLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={`${styles.container}`}>
        <div className={styles.animation}>
          <Lottie
            animationData={animationData}
            loop
            autoplay
            style={{ width: '100%', height: '100%' }}
          />
          <div className={styles.logoAnimation}>
            <Lottie animationData={animationDataLogo} loop autoplay style={{ width: "100%", height: "100%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
