import styles from "@/styles/GamePlaceholderCardGrid.module.css";


export default function GamePlaceholderCardGrid() {
  return (
    <div className={styles.placeholderWrap}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className={styles.placeholderCard}></div>
      ))}
    </div>
  );
}