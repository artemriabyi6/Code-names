
import GameBoard from "@/components/GameBoard/GameBoard";
import styles from "./page.module.scss";

export default function Home() {
  return (
    <main className={styles.page}>
      <GameBoard />
    </main>
  );
}
