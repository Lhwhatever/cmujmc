import Hand from './Hand';
import * as MahjongTiles from '../../utils/mahjong/tiles';
import Heading from '../Heading';
import Tile from './Tile';
import Timer from '../Timer';
import clsx from 'clsx';
import { useState } from 'react';
import { useMeasure } from 'react-use';
import { z } from 'zod';
import v1_schema from '../../utils/wwyd/2d_schema';
import { mpszHandResolver, mpszTileResolver } from '../../utils/mahjong/tiles';

export interface Scenario2DProps {
  scenario: z.infer<typeof v1_schema>;
  settings: {
    endDate: Date;
  };
}

const computeTileWidth = (width: number, height: number) => {
  if (width >= 1280 && height >= 480) return 48;
  if (width >= 1024 && height >= 384) return 42;
  if (width >= 768 && height >= 288) return 36;
  return 30;
};

export default function Scenario2D({ scenario, settings }: Scenario2DProps) {
  const { hand: serializedHand, handNumber, seat, dora, turn } = scenario;
  const { endDate } = settings;

  const [doRiichi, setDoRiichi] = useState(false);

  const [ref, { width, height }] = useMeasure<HTMLDivElement>();
  const tileWidth = computeTileWidth(width, height);

  const hand = {
    tiles: mpszHandResolver.parse(serializedHand.tiles),
    draw: scenario.hand.draw
      ? mpszTileResolver.parse(serializedHand.draw)
      : undefined,
    calls: [],
  };

  return (
    <div ref={ref} className="bg-green-700 h-full w-full px-4 py-4">
      <div className="w-full max-w-4xl m-auto">
        <div className="flex flex-row justify-between content-center">
          <Heading level="h4" className="h-min block">
            {MahjongTiles.handNumberToEnglish(handNumber)} &middot;{' '}
            {MahjongTiles.seatWindToEnglish(seat)} Seat &middot; Turn {turn}
          </Heading>
          <div className="flex flex-row gap-1 align-middle self-center">
            <Heading level="h6">Dora</Heading>
            {dora.map((dora, index) => (
              <Tile
                key={index}
                tile={MahjongTiles.mpszTileResolver.parse(dora)}
                tileWidth={tileWidth}
              />
            ))}
          </div>
        </div>
        <div className="text-center">
          Double-tap on a tile from your hand to select it.
        </div>
        <div className="grow" />
        <div className="flex flex-row justify-end my-8 gap-2">
          <div
            className={clsx(
              'text-2xl px-2 py-2 min-w-24 text-center cursor-pointer',
              'bg-orange-900 text-orange-400 hover:bg-orange-800',
            )}
            onClick={() => setDoRiichi(true)}
          >
            Riichi
          </div>
          <div
            className={clsx(
              'text-2xl px-2 py-2 min-w-24 text-center cursor-pointer',
              'bg-gray-900 text-gray-400 hover:bg-gray-800',
              doRiichi && 'invisible',
            )}
            onClick={() => setDoRiichi(false)}
          >
            Skip
          </div>
          <Timer
            endDate={endDate}
            className="text-yellow-500 drop-shadow-xl text-5xl w-20 text-right ml-4"
          />
        </div>
        <div>
          <Hand hand={hand} tileWidth={tileWidth} />
        </div>
      </div>
    </div>
  );
}
