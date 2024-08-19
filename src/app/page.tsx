import styles from "./page.module.css";
import CallComponent from "../components/CallComponent";

export default function Home() {
  return (
    <main className={styles.main}>
      Interviewer assessment
      <CallComponent />
    </main>
  );
}
