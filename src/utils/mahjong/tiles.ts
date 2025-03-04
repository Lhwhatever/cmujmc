export enum Tile {
  TILE_1M = 1,
  TILE_2M = 2,
  TILE_3M = 3,
  TILE_4M = 4,
  TILE_5M = 5,
  TILE_6M = 6,
  TILE_7M = 7,
  TILE_8M = 8,
  TILE_9M = 9,
  TILE_0M = 0,
  TILE_1P = 11,
  TILE_2P = 12,
  TILE_3P = 13,
  TILE_4P = 14,
  TILE_5P = 15,
  TILE_6P = 16,
  TILE_7P = 17,
  TILE_8P = 18,
  TILE_9P = 19,
  TILE_0P = 10,
  TILE_1S = 21,
  TILE_2S = 22,
  TILE_3S = 23,
  TILE_4S = 24,
  TILE_5S = 25,
  TILE_6S = 26,
  TILE_7S = 27,
  TILE_8S = 28,
  TILE_9S = 29,
  TILE_0S = 20,
  TILE_1Z = 80,
  TILE_2Z = 81,
  TILE_3Z = 82,
  TILE_4Z = 83,
  TILE_5Z = 90,
  TILE_6Z = 91,
  TILE_7Z = 92,
}

export enum Suit {
  MAN,
  PIN,
  SOU,
  KAZE,
  SANGEN,
}

export const getSuit = (tile: Tile): Suit => {
  if (0 <= tile && tile <= 9) return Suit.MAN;
  if (10 <= tile && tile <= 19) return Suit.PIN;
  if (20 <= tile && tile <= 29) return Suit.SOU;
  if (80 <= tile && tile <= 83) return Suit.KAZE;
  return Suit.SANGEN;
};

export const isAkadora = (tile: Tile): boolean => {
  return tile == Tile.TILE_0M || tile == Tile.TILE_0P || tile == Tile.TILE_0S;
};

export const getTileNumber = (tile: Tile): number => {
  if (isAkadora(tile)) return 5;
  return tile % 10;
};

const offsets = {
  m: 0,
  p: 10,
  s: 20,
};

export const parseMpsz = (hand: string): Tile[] => {
  const result: Tile[] = [];
  let buffer: number[] = [];

  for (let i = 0, n = hand.length; i < n; i++) {
    const charCode = hand.charCodeAt(i);
    if (0x30 <= charCode && charCode <= 0x39) {
      // 0-9
      buffer.push(charCode - 0x30);
      continue;
    }

    const char = hand.charAt(i);
    if (char === 'm' || char === 'p' || char === 's') {
      if (buffer.length === 0)
        throw new Error(`${char} not preceded by number`);
      for (const num of buffer) {
        result.push((offsets[char] + num) as Tile);
      }
      buffer = [];
      continue;
    }

    if (char === 'z') {
      if (buffer.length === 0) throw new Error(`z not preceded by number`);
      for (const num of buffer) {
        switch (num) {
          case 1:
          case 2:
          case 3:
          case 4:
            result.push(Tile.TILE_1Z + num - 1);
            break;
          case 5:
          case 6:
          case 7:
            result.push(Tile.TILE_5Z + num - 5);
            break;
          default:
            throw new Error(`Illegal number before z: ${num}`);
        }
      }
      buffer = [];
      continue;
    }

    throw new Error(`Unrecognized character ${char}`);
  }

  return result;
};

export enum SeatRelative {
  JICHA = 0,
  SHIMOCHA = 1,
  TOIMEN = 2,
  KAMICHA = 3,
}

export type Call =
  | { type: 'chii'; discard: Tile; support: [Tile, Tile] }
  | {
      type: 'pon';
      discard: Tile;
      support: [Tile, Tile];
      source: 1 | 2 | 3;
    }
  | {
      type: 'daiminkan';
      discard: Tile;
      support: [Tile, Tile, Tile];
      source: SeatRelative;
    }
  | {
      type: 'shouminkan';
      discard: Tile;
      kanTile: Tile;
      support: [Tile, Tile];
      source: SeatRelative;
    }
  | {
      type: 'ankan';
      tile: [Tile, Tile, Tile, Tile];
    };

export interface Hand {
  tiles: Tile[];
  draw?: Tile;
  calls?: Call[];
}

export enum SeatWind {
  EAST = 0,
  SOUTH = 1,
  WEST = 2,
  NORTH = 3,
}

export const seatWindToEnglish = (seatWind: SeatWind): string => {
  switch (seatWind) {
    case SeatWind.EAST:
      return 'East';
    case SeatWind.SOUTH:
      return 'South';
    case SeatWind.WEST:
      return 'West';
    case SeatWind.NORTH:
      return 'North';
  }
};

export interface HandNumber {
  prevalentWind: SeatWind;
  dealerNumber: 1 | 2 | 3 | 4;
  honba: number;
}

export const handNumberToEnglish = ({
  prevalentWind,
  dealerNumber,
  honba,
}: HandNumber): string => {
  const suffix = honba > 0 ? `-${honba}` : '';
  return `${seatWindToEnglish(prevalentWind)} ${dealerNumber}${suffix}`;
};
