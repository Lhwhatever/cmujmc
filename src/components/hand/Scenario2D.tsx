import Hand from './Hand';
import * as MahjongTiles from '../../utils/mahjong/tiles';
import Heading from '../Heading';
import Tile from './Tile';
import Timer from '../Timer';
import clsx from 'clsx';
import { useState } from 'react';

export interface Scenario2DProps {
  scenario: {
    hand: MahjongTiles.Hand;
    handNumber: MahjongTiles.HandNumber;
    turn: number;
    seat: MahjongTiles.SeatWind;
    dora: MahjongTiles.Tile[];
  };
  settings: {
    endDate: Date;
  };
  options?: {
    discard?: MahjongTiles.Tile[];
    riichi?: MahjongTiles.Tile[];
  };
  tileWidth: number;
}

export default function Scenario2D({
  scenario,
  settings,
  options = {},
  tileWidth,
}: Scenario2DProps) {
  const { hand, handNumber, seat, dora, turn } = scenario;
  const { endDate } = settings;

  const [doRiichi, setDoRiichi] = useState(() => {
    if (options.discard !== undefined && options.discard.length === 0)
      return true;
    if (options.riichi !== undefined && options.riichi.length === 0)
      return false;
    return undefined;
  });

  const discardTiles = options.discard && new Set(options.discard);
  const riichiTiles = options.riichi && new Set(options.riichi);

  const showRiichi = options.riichi === undefined || options.riichi.length > 0;
  const showSkip = showRiichi;

  return (
    <div className="bg-green-700 flex flex-col h-full w-full px-4 py-4">
      <div className="flex flex-row justify-between content-center">
        <Heading level="h4" className="h-min block">
          {MahjongTiles.handNumberToEnglish(handNumber)} &middot;{' '}
          {MahjongTiles.seatWindToEnglish(seat)} Seat &middot; Turn {turn}
        </Heading>
        <div className="flex flex-row gap-1 align-middle self-center">
          <Heading level="h6">Dora</Heading>
          {dora.map((dora, index) => (
            <Tile key={index} tile={dora} tileWidth={tileWidth} />
          ))}
        </div>
      </div>
      <div className="grow" />
      <div className="flex flex-row justify-end my-8 gap-2">
        <div
          className={clsx(
            'text-2xl px-2 py-2 min-w-24 text-center cursor-pointer',
            'bg-orange-900 text-orange-400 hover:bg-orange-800',
            doRiichi && 'bg-orange-800',
            showRiichi ? '' : 'hidden',
          )}
          onClick={() => setDoRiichi(true)}
        >
          Riichi
        </div>
        <div
          className={clsx(
            'text-2xl px-2 py-2 min-w-24 text-center cursor-pointer',
            'bg-gray-900 text-gray-400 hover:bg-gray-800',
            showSkip ? '' : 'hidden',
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
        <Hand
          hand={hand}
          tileWidth={tileWidth}
          options={doRiichi ? riichiTiles : discardTiles}
        />
      </div>
    </div>
  );
}
