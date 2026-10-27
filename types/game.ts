
export type Team = "blue" | "red";

export type CardRole = Team | "neutral" | "assassin";

export interface GameCard {
  id: number;
  word: string;
  role: CardRole;
  revealed: boolean;
}

export interface GameState {
  cards: GameCard[];
  currentTeam: Team;
  winner: Team | null;
  gameOver: boolean;
}
