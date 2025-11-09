// components/SlotsBanner/SlotsBanner.tsx
import Image from "next/image";
import styles from "@/styles/SlotsBanner.module.css";

type SlotsBannerProps = {
  title?: string;
  className?: string;
};

export default function SlotsBanner({ title = "Слоты", className }: SlotsBannerProps) {
  return (
    <section className={`${styles.wrap} ${className || ""}`}>
      <h2 className={styles.title}>{title}</h2>
    </section>
  );
}