import { GameMode } from '../generated/prisma/enums';

export const getNumPlayers = (gameMode: GameMode) => {
  switch (gameMode) {
    case GameMode.SANMA:
      return 3;
    case GameMode.YONMA:
      return 4;
  }
};