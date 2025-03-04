import * as Tile from './tiles';
import { Map } from 'immutable';

export type TileCounts = Map<Tile.Tile, number>;

export const toTileCounts = (tiles: Tile.Tile[]): TileCounts =>
  Map<Tile.Tile, number>().withMutations((counts) => {
    for (const tile of tiles) {
      counts.set(tile, (counts.get(tile) ?? 0) + 1);
    }
    return counts;
  });

interface IRecognizer<T> {
  test: (tileCounts: TileCounts) => [T, TileCounts] | null;
}

export type Either<T, U> = { type: 0; data: T } | { type: 1; data: U };

export class Disjunction<T, U> implements IRecognizer<Either<T, U>> {
  readonly a: IRecognizer<T>;
  readonly b: IRecognizer<U>;

  constructor(a: IRecognizer<T>, b: IRecognizer<U>) {
    this.a = a;
    this.b = b;
  }

  public test(tileCounts: TileCounts): [Either<T, U>, TileCounts] | null {
    const firstResult = this.a.test(tileCounts);
    if (firstResult !== null)
      return [
        {
          type: 0,
          data: firstResult[0],
        },
        firstResult[1],
      ];

    const secondResult = this.b.test(tileCounts);
    if (secondResult === null) return null;

    return [
      {
        type: 1,
        data: secondResult[0],
      },
      secondResult[1],
    ];
  }
}

export class TileRecognizer implements IRecognizer<Tile.Tile> {
  readonly t: Tile.Tile;

  constructor(tile: Tile.Tile) {
    this.t = tile;
  }

  public test(tileCounts: TileCounts): [Tile.Tile, TileCounts] | null {
    const newCount = (tileCounts.get(this.t) ?? 0) - 1;
    if (newCount >= 0) {
      return [this.t, tileCounts.set(this.t, newCount)];
    }
    return null;
  }
}

export class Compose<T, U> implements IRecognizer<U> {
  readonly a: IRecognizer<T>;
  readonly f: (_: T) => IRecognizer<U>;

  constructor(a: IRecognizer<T>, f: (_: T) => IRecognizer<U>) {
    this.a = a;
    this.f = f;
  }

  public test(tileCounts: TileCounts): [U, TileCounts] | null {
    const firstResult = this.a.test(tileCounts);
    if (firstResult === null) return null;
    return this.f(firstResult[0]).test(firstResult[1]);
  }
}
