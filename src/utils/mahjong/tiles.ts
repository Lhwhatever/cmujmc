import { z } from 'zod';

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

const charCodeToNum = (charCode: number): number | null => {
  if (0x30 <= charCode && charCode <= 0x39) {
    return charCode - 0x30;
  }
  return null;
};

const makeTile = (
  num: number,
  letter: string,
  ctx: z.RefinementCtx,
): Tile | null => {
  switch (letter) {
    case 'm':
      return (Tile.TILE_0M + num) as Tile;
    case 'p':
      return (Tile.TILE_0P + num) as Tile;
    case 's':
      return (Tile.TILE_0S + num) as Tile;
    case 'z':
      if (num < 1 || num > 7) {
        ctx.addIssue({
          code: 'custom',
          message: `Cannot have number ${num} before 'z'`,
        });
        return null;
      }
      if (num <= 4) {
        return (Tile.TILE_1Z + num - 1) as Tile;
      }
      return (Tile.TILE_5Z + num - 5) as Tile;
    default:
      ctx.addIssue({
        code: 'custom',
        message: `Illegal suit ${letter}`,
      });
      return null;
  }
};

const mpszTileTransformer = (s: string, ctx: z.RefinementCtx) => {
  if (s.length !== 2) {
    ctx.addIssue({
      code: 'custom',
      message: `Expected 2 characters, received ${s.length}`,
    });
    return null;
  }

  const num = charCodeToNum(s.charCodeAt(0));
  if (num === null) {
    // 0-9
    ctx.addIssue({
      code: 'custom',
      message: `Expected numeric first character, received ${s.charAt(0)}`,
    });
    return null;
  }

  return makeTile(num, s.charAt(1), ctx);
};

export const mpszTileResolver = z
  .string()
  .transform((s, ctx) => mpszTileTransformer(s, ctx) ?? z.NEVER);
export const mpszTileValidator = z.string().superRefine(mpszTileTransformer);

const mpszHandTransformer = (hand: string, ctx: z.RefinementCtx) => {
  const result: Tile[] = [];
  let buffer: number[] = [];

  for (let i = 0, n = hand.length; i < n; i++) {
    const num = charCodeToNum(hand.charCodeAt(i));
    if (num !== null) {
      buffer.push(num);
      continue;
    }

    const char = hand.charAt(i);
    if (buffer.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: `Expected digit preceding ${char} at position ${i}`,
      });
    }

    for (const num of buffer) {
      const tile = makeTile(num, char, ctx);
      if (tile === null) return null;
      result.push(tile);
    }
    buffer = [];
  }

  if (buffer.length > 0) {
    ctx.addIssue({
      code: 'custom',
      message: `Trailing digits found: ${buffer.join()}`,
    });
    return null;
  }

  return result;
};

export const mpszHandResolver = z
  .string()
  .transform((s, ctx) => mpszHandTransformer(s, ctx) ?? z.NEVER);
export const mpszHandValidator = z.string().superRefine(mpszHandTransformer);

export const toMpsz = (tile: Tile): string => {
  if (tile <= Tile.TILE_9M) {
    return `${tile - offsets.m}m`;
  }
  if (tile <= Tile.TILE_9P) {
    return `${tile - offsets.p}p`;
  }
  if (tile <= Tile.TILE_9S) {
    return `${tile - offsets.s}s`;
  }
  if (tile <= Tile.TILE_4Z) {
    return `${tile - Tile.TILE_1Z + 1}z`;
  }
  return `${tile - Tile.TILE_5Z + 5}z`;
};

export enum SeatRelative {
  JICHA = 0,
  SHIMOCHA = 1,
  TOIMEN = 2,
  KAMICHA = 3,
}

export type OpponentSeatRelative =
  | SeatRelative.SHIMOCHA
  | SeatRelative.TOIMEN
  | SeatRelative.KAMICHA;

export interface CallPon {
  type: 'pon';
  discard: Tile;
  support: [Tile, Tile];
  source: OpponentSeatRelative;
}

export interface CallDaiminkan {
  type: 'daiminkan';
  discard: Tile;
  support: [Tile, Tile, Tile];
  source: OpponentSeatRelative;
}

export interface CallShouminkan {
  type: 'shouminkan';
  discard: Tile;
  kanTile: Tile;
  support: [Tile, Tile];
  source: SeatRelative.SHIMOCHA | SeatRelative.TOIMEN | SeatRelative.KAMICHA;
}

export type Call =
  | { type: 'chii'; discard: Tile; support: [Tile, Tile] }
  | CallPon
  | CallDaiminkan
  | CallShouminkan
  | {
      type: 'ankan';
      tile: [Tile, Tile, Tile, Tile];
    };

const normalizeAka = (n: number) => (n === 0 ? 5 : n);
const asteriskCode = 0x2a;
const questionMarkCode = 0x3f;

const expectAnotherTile = (
  expectedNorm: number,
  s: string,
  index: number,
  ctx: z.RefinementCtx,
): number | null => {
  const num = charCodeToNum(s.charCodeAt(index));
  if (num === null) {
    ctx.addIssue({
      code: 'custom',
      message: `Inferred there should be a digit at index ${index}, got ${s.charAt(
        index,
      )}`,
    });
    return null;
  }

  if (normalizeAka(num) !== expectedNorm) {
    ctx.addIssue({
      code: 'custom',
      message: `Expected num of type ${expectedNorm}, but got ${num}`,
    });
    return null;
  }

  return num;
};

const expectDiscardMarker = (
  s: string,
  i: number,
  ctx: z.RefinementCtx,
): boolean => {
  const charCodeA = s.charCodeAt(i);
  const success = charCodeA === asteriskCode;
  if (!success) {
    ctx.addIssue({
      code: 'custom',
      message: `Inferred to be call from shimocha from leading characters, from length, expected * marker at index ${i}`,
    });
  }
  return success;
};

const expectKanTileMarker = (
  s: string,
  i: number,
  ctx: z.RefinementCtx,
): boolean => {
  const charCodeA = s.charCodeAt(i);
  const charCodeB = s.charCodeAt(i + 1);
  const success = charCodeA === asteriskCode && charCodeB === asteriskCode;
  if (!success) {
    ctx.addIssue({
      code: 'custom',
      message: `Inferred to be shouminkan from length 8, from position of discard tile, expected ** marker at indices ${i}-${
        i + 1
      }`,
    });
  }
  return success;
};

const makePon = (
  discardNum: number,
  firstSupportNum: number,
  secondSupportNum: number,
  letter: string,
  source: OpponentSeatRelative,
  ctx: z.RefinementCtx,
): CallPon | null => {
  const discard = makeTile(discardNum, letter, ctx);
  const firstSupport = makeTile(firstSupportNum, letter, ctx);
  const secondSupport = makeTile(secondSupportNum, letter, ctx);

  if (discard === null || firstSupport === null || secondSupport === null) {
    return null;
  }

  return {
    type: 'pon',
    discard,
    support: [firstSupport, secondSupport],
    source,
  };
};

const makeDaiminkan = (
  discardNum: number,
  firstSupportNum: number,
  secondSupportNum: number,
  thirdSupportNum: number,
  letter: string,
  source: OpponentSeatRelative,
  ctx: z.RefinementCtx,
): CallDaiminkan | null => {
  const discard = makeTile(discardNum, letter, ctx);
  const firstSupport = makeTile(firstSupportNum, letter, ctx);
  const secondSupport = makeTile(secondSupportNum, letter, ctx);
  const thirdSupport = makeTile(thirdSupportNum, letter, ctx);

  if (
    discard === null ||
    firstSupport === null ||
    secondSupport === null ||
    thirdSupport === null
  ) {
    return null;
  }

  return {
    type: 'daiminkan',
    discard,
    support: [firstSupport, secondSupport, thirdSupport],
    source,
  };
};

const makeShouminkan = (
  discardNum: number,
  kanTileNum: number,
  firstSupportNum: number,
  secondSupportNum: number,
  letter: string,
  source: OpponentSeatRelative,
  ctx: z.RefinementCtx,
): CallShouminkan | null => {
  const discard = makeTile(discardNum, letter, ctx);
  const kanTile = makeTile(kanTileNum, letter, ctx);
  const firstSupport = makeTile(firstSupportNum, letter, ctx);
  const secondSupport = makeTile(secondSupportNum, letter, ctx);

  if (
    discard === null ||
    kanTile === null ||
    firstSupport === null ||
    secondSupport === null
  ) {
    return null;
  }

  return {
    type: 'shouminkan',
    discard,
    kanTile,
    support: [firstSupport, secondSupport],
    source,
  };
};

const callChomboNotationTransformer = (
  call: string,
  ctx: z.RefinementCtx,
): Call | null => {
  if (call.length !== 5 && call.length !== 6 && call.length !== 8) {
    ctx.addIssue({
      code: 'custom',
      message: `Expected representation of call to have length 5, 6 or 8`,
    });
    return null;
  }

  const firstCharCode = call.charCodeAt(0);
  if (firstCharCode === questionMarkCode) {
    // it's ANKAN
    const firstNum = charCodeToNum(call.charCodeAt(1));
    const secondNum = charCodeToNum(call.charCodeAt(2));
    if (firstNum === null || secondNum === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Expected two numbers to follow ? for ankan',
      });
      return null;
    }

    if (normalizeAka(firstNum) !== normalizeAka(secondNum)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Expected ankan to use the same tile',
      });
      return null;
    }

    const letter = call.charAt(3);
    const firstTile = makeTile(firstNum, letter, ctx);
    const secondTile = makeTile(secondNum, letter, ctx);
    if (firstTile === null || secondTile === null) {
      return null;
    }

    if (call.charCodeAt(4) !== questionMarkCode || call.length > 5) {
      ctx.addIssue({
        code: 'custom',
        message: 'Expected ? to be last character of ankan representation',
      });
      return null;
    }

    return {
      type: 'ankan',
      tile:
        firstTile === secondTile
          ? [firstTile, firstTile, firstTile, firstTile]
          : firstNum === 0
          ? [secondTile, firstTile, secondTile, secondTile]
          : [firstTile, firstTile, secondTile, firstTile],
    };
  }

  const firstNum = charCodeToNum(firstCharCode);
  if (firstNum === null) {
    ctx.addIssue({
      code: 'custom',
      message: `Expected first character to be numeric or ?`,
    });
    return null;
  }
  const firstNumNorm = normalizeAka(firstNum);

  const secondCharCode = call.charCodeAt(1);
  if (secondCharCode === asteriskCode) {
    // from KAMICHA
    const secondNum = charCodeToNum(call.charCodeAt(2));
    if (secondNum === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Expected number to follow *',
      });
      return null;
    }
    const secondNumNorm = normalizeAka(secondNum);

    if (firstNumNorm !== secondNumNorm) {
      // it's a CHII
      const thirdNum = charCodeToNum(call.charCodeAt(3));
      if (thirdNum === null) {
        ctx.addIssue({
          code: 'custom',
          message: 'Expected a third digit',
        });
        return null;
      }

      const thirdNumNorm = normalizeAka(thirdNum);
      const nums = [firstNumNorm, secondNumNorm, thirdNumNorm].sort();
      if (nums[1] != nums[0] + 1 || nums[2] != nums[0] + 2) {
        ctx.addIssue({
          code: 'custom',
          message: `Can't form sequence with ${nums.join()}`,
        });
        return null;
      }

      if (call.length !== 5) {
        ctx.addIssue({
          code: 'custom',
          message: `Trailing characters: ${call.slice(5)}`,
        });
        return null;
      }

      const letter = call.charAt(4);
      if (letter === 'm' || letter === 'p' || letter === 's') {
        const discard = makeTile(firstNum, letter, ctx);
        const firstSupport = makeTile(secondNum, letter, ctx);
        const secondSupport = makeTile(thirdNum, letter, ctx);
        if (
          discard === null ||
          firstSupport === null ||
          secondSupport === null
        ) {
          return null;
        }

        return {
          type: 'chii',
          discard,
          support: [firstSupport, secondSupport],
        };
      }

      ctx.addIssue({
        code: 'custom',
        message: `Illegal character following third number: ${letter}`,
      });
      return null;
    }

    switch (call.length) {
      case 5: {
        const thirdNum = expectAnotherTile(firstNumNorm, call, 3, ctx);
        if (thirdNum === null) return null;
        return makePon(
          firstNum,
          secondNum,
          thirdNum,
          call.charAt(4),
          SeatRelative.KAMICHA,
          ctx,
        );
      }
      case 6: {
        const thirdNum = expectAnotherTile(firstNumNorm, call, 3, ctx);
        const fourthNum = expectAnotherTile(firstNumNorm, call, 4, ctx);
        if (thirdNum === null || fourthNum === null) return null;
        return makeDaiminkan(
          firstNum,
          secondNum,
          thirdNum,
          fourthNum,
          call.charAt(5),
          SeatRelative.KAMICHA,
          ctx,
        );
      }
      case 8: {
        if (!expectKanTileMarker(call, 3, ctx)) return null;
        const thirdNum = expectAnotherTile(firstNumNorm, call, 5, ctx);
        const fourthNum = expectAnotherTile(firstNumNorm, call, 6, ctx);
        if (thirdNum === null || fourthNum === null) return null;
        return makeShouminkan(
          firstNum,
          secondNum,
          thirdNum,
          fourthNum,
          call.charAt(7),
          SeatRelative.KAMICHA,
          ctx,
        );
      }
    }
  }

  const secondNum = expectAnotherTile(firstNumNorm, call, 1, ctx);
  if (secondNum === null) return null;

  const thirdCharCode = call.charCodeAt(2);
  if (thirdCharCode === asteriskCode) {
    // from TOIMEN
    const thirdNum = expectAnotherTile(firstNumNorm, call, 3, ctx);
    if (thirdNum === null) return null;

    switch (call.length) {
      case 5:
        return makePon(
          secondNum,
          firstNum,
          thirdNum,
          call.charAt(4),
          SeatRelative.TOIMEN,
          ctx,
        );
      case 6: {
        const fourthNum = expectAnotherTile(firstNumNorm, call, 4, ctx);
        if (fourthNum === null) return null;
        return makeDaiminkan(
          secondNum,
          firstNum,
          thirdNum,
          fourthNum,
          call.charAt(5),
          SeatRelative.TOIMEN,
          ctx,
        );
      }
      case 8: {
        if (!expectKanTileMarker(call, 4, ctx)) return null;
        const fourthNum = expectAnotherTile(firstNum, call, 6, ctx);
        if (fourthNum === null) return null;
        return makeShouminkan(
          secondNum,
          firstNum,
          thirdNum,
          fourthNum,
          call.charAt(7),
          SeatRelative.TOIMEN,
          ctx,
        );
      }
    }
  }

  // from SHIMOCHA
  const thirdNum = expectAnotherTile(firstNum, call, 2, ctx);
  if (thirdNum === null) return null;

  switch (call.length) {
    case 5:
      if (!expectDiscardMarker(call, 3, ctx)) return null;
      return makePon(
        thirdNum,
        firstNum,
        secondNum,
        call.charAt(4),
        SeatRelative.SHIMOCHA,
        ctx,
      );
    case 6: {
      const fourthNum = expectAnotherTile(firstNum, call, 3, ctx);
      if (fourthNum === null) return null;
      if (!expectDiscardMarker(call, 4, ctx)) return null;
      return makeDaiminkan(
        fourthNum,
        firstNum,
        secondNum,
        thirdNum,
        call.charAt(5),
        SeatRelative.SHIMOCHA,
        ctx,
      );
    }
    case 8: {
      if (!expectDiscardMarker(call, 3, ctx)) return null;
      const fourthNum = expectAnotherTile(firstNum, call, 4, ctx);
      if (fourthNum === null) return null;
      if (!expectDiscardMarker(call, 5, ctx)) return null;
      return makeShouminkan(
        thirdNum,
        fourthNum,
        firstNum,
        secondNum,
        call.charAt(7),
        SeatRelative.SHIMOCHA,
        ctx,
      );
    }
  }
};

export const callChomboNotationResolver = z
  .string()
  .transform((s, ctx) => callChomboNotationTransformer(s, ctx) ?? z.NEVER);

export const callChomboNotationValidator = z
  .string()
  .superRefine(callChomboNotationTransformer);

export interface Hand {
  tiles: Tile[];
  draw?: Tile;
  calls?: Call[];
}

export type SeatWind = 'E' | 'S' | 'W' | 'N';

export const seatWindToEnglish = (seatWind: SeatWind): string => {
  switch (seatWind) {
    case 'E':
      return 'East';
    case 'S':
      return 'South';
    case 'W':
      return 'West';
    case 'N':
      return 'North';
  }
};

export interface HandNumber {
  prevalentWind: SeatWind;
  dealerNumber: 1 | 2 | 3 | 4;
  honba?: number;
}

export const handNumberToEnglish = ({
  prevalentWind,
  dealerNumber,
  honba = 0,
}: HandNumber): string => {
  const suffix = honba > 0 ? `-${honba}` : '';
  return `${seatWindToEnglish(prevalentWind)} ${dealerNumber}${suffix}`;
};
