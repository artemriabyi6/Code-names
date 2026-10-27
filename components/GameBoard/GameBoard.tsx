
"use client";

import { useEffect, useRef, useState } from "react";
import { words } from "@/data/words";
import type { CardRole, GameCard, GameState, Team } from "@/types/game";
import styles from "./GameBoard.module.scss";

type CaptainHint = {
  team: Team;
  text: string;
  count: number;
};

const DEFAULT_TIMER = 60;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function createGame(): GameState {
  const firstTeam: Team = Math.random() < 0.5 ? "blue" : "red";
  const secondTeam: Team = firstTeam === "blue" ? "red" : "blue";

  const roles: CardRole[] = shuffle<CardRole>([
    ...Array(9).fill(firstTeam),
    ...Array(8).fill(secondTeam),
    ...Array(7).fill("neutral"),
    "assassin",
  ]);

  const selectedWords = shuffle(words).slice(0, 25);

  const cards: GameCard[] = selectedWords.map((word, index) => ({
    id: index,
    word,
    role: roles[index],
    revealed: false,
  }));

  return {
    cards,
    currentTeam: firstTeam,
    winner: null,
    gameOver: false,
  };
}

function getOtherTeam(team: Team): Team {
  return team === "blue" ? "red" : "blue";
}

function playBeep(frequency = 800, duration = 150) {
  try {
    const audioContext = new window.AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.15,
      audioContext.currentTime + 0.02
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + duration / 1000
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration / 1000);

    oscillator.onended = () => {
      void audioContext.close();
    };

    void audioContext.resume();
  } catch {
    // Гра продовжує працювати, навіть якщо звук недоступний.
  }
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

export default function GameBoard() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [showKey, setShowKey] = useState(false);

  const [timerDuration, setTimerDuration] = useState(DEFAULT_TIMER);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMER);
  const timeLeftRef = useRef(DEFAULT_TIMER);
  const [timerRunning, setTimerRunning] = useState(false);

  const [clueInput, setClueInput] = useState("");
  const [clueCountInput, setClueCountInput] = useState("1");
  const [currentHint, setCurrentHint] = useState<CaptainHint | null>(null);

  const blueRemaining = game.cards.filter(
    (card) => card.role === "blue" && !card.revealed
  ).length;

  const redRemaining = game.cards.filter(
    (card) => card.role === "red" && !card.revealed
  ).length;

  function resetTurnControls() {
    setTimerRunning(false);
    timeLeftRef.current = timerDuration;
    setTimeLeft(timerDuration);
    setCurrentHint(null);
    setClueInput("");
    setClueCountInput("1");
    setShowKey(false);
  }

  function startTurnTimer() {
    if (game.gameOver || timerRunning) return;

    timeLeftRef.current = timerDuration;
    setTimeLeft(timerDuration);
    setTimerRunning(true);
    playBeep(520, 220);
  }

  function handleHintSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = clueInput.trim();
    const count = Number(clueCountInput);

    if (
      !text ||
      !Number.isInteger(count) ||
      count < 0 ||
      count > 9 ||
      game.gameOver ||
      timerRunning
    ) {
      return;
    }

    setCurrentHint({
      team: game.currentTeam,
      text,
      count,
    });

    setClueInput("");
    startTurnTimer();
  }

  function handleCardClick(id: number) {
    if (game.gameOver || showKey) return;

    const selectedCard = game.cards.find((card) => card.id === id);

    if (!selectedCard || selectedCard.revealed) return;

    const updatedCards = game.cards.map((card) =>
      card.id === id ? { ...card, revealed: true } : card
    );

    let winner: Team | null = null;
    let gameOver = false;
    let currentTeam = game.currentTeam;

    if (selectedCard.role === "assassin") {
      winner = getOtherTeam(game.currentTeam);
      gameOver = true;
    } else if (
      selectedCard.role === "blue" &&
      updatedCards.every(
        (card) => card.role !== "blue" || card.revealed
      )
    ) {
      winner = "blue";
      gameOver = true;
    } else if (
      selectedCard.role === "red" &&
      updatedCards.every(
        (card) => card.role !== "red" || card.revealed
      )
    ) {
      winner = "red";
      gameOver = true;
    } else if (selectedCard.role !== game.currentTeam) {
      currentTeam = getOtherTeam(game.currentTeam);
    }

    setGame({
      cards: updatedCards,
      currentTeam,
      winner,
      gameOver,
    });

    if (gameOver || currentTeam !== game.currentTeam) {
      resetTurnControls();
    }
  }

  function handleEndTurn() {
    if (game.gameOver) return;

    setGame((previousGame) => ({
      ...previousGame,
      currentTeam: getOtherTeam(previousGame.currentTeam),
    }));

    resetTurnControls();
  }

  function startNewGame() {
    setGame(createGame());
    resetTurnControls();
  }

  function handleDurationChange(value: string) {
    const duration = Number(value);

    setTimerDuration(duration);
    timeLeftRef.current = duration;
    setTimeLeft(duration);
  }

  function getCardClass(card: GameCard) {
    if (showKey || card.revealed) {
      return styles[card.role];
    }

    return styles.hidden;
  }

  useEffect(() => {
    if (!timerRunning) return;

    const interval = window.setInterval(() => {
      const nextTime = Math.max(timeLeftRef.current - 1, 0);

      timeLeftRef.current = nextTime;
      setTimeLeft(nextTime);

      if (nextTime === Math.ceil(timerDuration / 2)) {
        playBeep(680, 250);
      } else if (nextTime > 0 && nextTime <= 5) {
        playBeep(nextTime === 1 ? 1150 : 900, 130);
      }

      if (nextTime === 0) {
        setTimerRunning(false);

        setGame((previousGame) => {
          if (previousGame.gameOver) return previousGame;

          return {
            ...previousGame,
            currentTeam: getOtherTeam(previousGame.currentTeam),
          };
        });

        timeLeftRef.current = timerDuration;
        setTimeLeft(timerDuration);
        setCurrentHint(null);
        setClueInput("");
        setClueCountInput("1");
        setShowKey(false);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning, timerDuration]);

  return (
    <main className={styles.game}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <p className={styles.eyebrow}>ГРА ДЛЯ КОМПАНІЇ</p>
          <h1>Кодові слова</h1>
        </div>

        <button
          className={styles.newGameButton}
          onClick={startNewGame}
        >
          Нова гра
        </button>
      </header>

      <section className={styles.scoreboard}>
        <div className={`${styles.teamScore} ${styles.blueScore}`}>
          <span>Сині</span>
          <strong>{blueRemaining}</strong>
          <small>агентів залишилось</small>
        </div>

        <div className={`${styles.teamScore} ${styles.redScore}`}>
          <span>Червоні</span>
          <strong>{redRemaining}</strong>
          <small>агентів залишилось</small>
        </div>
      </section>

      <section className={styles.status}>
        {game.gameOver ? (
          <h2>
            {game.winner === "blue"
              ? "Перемогли сині!"
              : "Перемогли червоні!"}
          </h2>
        ) : (
          <>
            <span
              className={`${styles.teamDot} ${
                game.currentTeam === "blue"
                  ? styles.blueDot
                  : styles.redDot
              }`}
            />
            <h2>
              Хід команди{" "}
              {game.currentTeam === "blue" ? "синіх" : "червоних"}
            </h2>
          </>
        )}
      </section>

      <section className={styles.turnPanel}>
        <div className={styles.timerHeader}>
          <div>
            <span className={styles.panelLabel}>ТАЙМЕР ХОДУ</span>
            <strong
              className={`${styles.timer} ${
                timeLeft <= 5 && timerRunning ? styles.timerUrgent : ""
              }`}
              aria-live="off"
            >
              {formatTime(timeLeft)}
            </strong>
          </div>

          <label className={styles.durationControl}>
            <span>Тривалість</span>
            <select
              value={timerDuration}
              disabled={timerRunning}
              onChange={(event) => handleDurationChange(event.target.value)}
            >
              <option value={30}>30 секунд</option>
              <option value={60}>1 хвилина</option>
              <option value={90}>1 хв 30 с</option>
              <option value={120}>2 хвилини</option>
              <option value={180}>3 хвилини</option>
            </select>
          </label>
        </div>

        {currentHint ? (
          <div
            className={`${styles.hintDisplay} ${
              currentHint.team === "blue"
                ? styles.blueHint
                : styles.redHint
            }`}
          >
            <span className={styles.panelLabel}>ПІДКАЗКА КАПІТАНА</span>
            <strong>{currentHint.text}</strong>
            <span>
              Кількість слів: <b>{currentHint.count}</b>
            </span>
          </div>
        ) : (
          <form className={styles.hintForm} onSubmit={handleHintSubmit}>
            <label className={styles.fieldLabel} htmlFor="captain-clue">
              Підказка капітана
            </label>

            <div className={styles.hintInputs}>
              <input
                id="captain-clue"
                className={styles.clueInput}
                type="text"
                placeholder="Введіть підказку..."
                value={clueInput}
                onChange={(event) => setClueInput(event.target.value)}
                maxLength={60}
                disabled={game.gameOver || timerRunning}
                required
              />

              <label className={styles.countControl}>
                <span>Слів</span>
                <select
                  value={clueCountInput}
                  onChange={(event) => setClueCountInput(event.target.value)}
                  disabled={game.gameOver || timerRunning}
                >
                  {Array.from({ length: 10 }, (_, index) => (
                    <option key={index} value={index}>
                      {index}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              className={styles.startButton}
              type="submit"
              disabled={game.gameOver || timerRunning || !clueInput.trim()}
            >
              Передати підказку й почати хід
            </button>
          </form>
        )}

        <div className={styles.turnActions}>
          <button
            className={styles.keyButton}
            onClick={() => setShowKey((visible) => !visible)}
            disabled={game.gameOver}
          >
            {showKey ? "Сховати поле капітанів" : "Поле капітанів"}
          </button>

          <button
            className={styles.endTurnButton}
            onClick={handleEndTurn}
            disabled={game.gameOver}
          >
            Завершити хід
          </button>
        </div>

        <p className={styles.hintText}>
          {showKey
            ? "Секретне поле відкрите. Сховайте його перед передаванням телефона."
            : timerRunning
              ? "Час пішов! Відкривайте слова за підказкою капітана."
              : "Капітан вводить підказку та кількість слів, щоб почати відлік."}
        </p>
      </section>

      <section className={styles.board} aria-label="Ігрове поле">
        {game.cards.map((card) => (
          <button
            key={card.id}
            className={`${styles.card} ${getCardClass(card)}`}
            onClick={() => handleCardClick(card.id)}
            disabled={game.gameOver || card.revealed || showKey}
            aria-label={
              card.revealed || showKey
                ? `${card.word}, ${card.role}`
                : card.word
            }
          >
            {card.word}
          </button>
        ))}
      </section>

      <p className={styles.footerHint}>
        Чужа картка завершує хід. Чорна картка означає поразку команди, яка її відкрила.
      </p>
    </main>
  );
}
