import Hand from './Hand';
import * as MahjongTiles from '../../utils/mahjong/tiles';
import Heading from '../Heading';
import Tile, { getHeightFromWidth } from './Tile';
import Timer from '../Timer';
import clsx from 'clsx';
import { ReactNode, useEffect, useState } from 'react';
import { useMeasure } from 'react-use';
import { z } from 'zod';
import v1_schema from '../../utils/wwyd/2d_schema';
import {
  mpszHandResolver,
  mpszTileResolver,
  toMpsz,
} from '../../utils/mahjong/tiles';
import { wwydResponseSchema } from '../../utils/wwyd/response';

const computeTileWidth = (width: number, height: number) => {
  if (width >= 1280 && height >= 480) return 72;
  if (width >= 1024 && height >= 384) return 60;
  if (width >= 768 && height >= 288) return 48;
  return 36;
};

interface InstructionProps {
  tiles: MahjongTiles.Tile[];
  tileWidth: number;
  selectedTileIdx: number | null;
  confirmedTileIdx: number | null;
  doRiichi: boolean;
}

const Instruction = ({
  tiles,
  tileWidth,
  selectedTileIdx,
  confirmedTileIdx,
}: InstructionProps) => {
  if (confirmedTileIdx !== null) return 'Your choice has been submitted!';

  if (selectedTileIdx === null)
    return 'Double-tap a tile to submit your choice.';

  if (selectedTileIdx < 0)
    return 'Tap on the drawn tile again to submit your choice.';

  return (
    <>
      Tap on the selected{' '}
      <Tile
        tile={tiles[selectedTileIdx]}
        tileWidth={tileWidth}
        style={{ display: 'inline-block', marginLeft: 2, marginRight: 2 }}
      />{' '}
      again to submit your choice!{' '}
    </>
  );
};

export interface Scenario2DProps {
  questionId: number;
  scenario: z.infer<typeof v1_schema>;
  settings: {
    endDate: Date;
  };
  onSubmit: (response: z.infer<typeof wwydResponseSchema>) => Promise<void>;
}

const createAnnotationsBottom = (
  confirmedIdx: number | null,
  tileHeight: number,
) => {
  const annotations: Record<number, ReactNode> = {};
  if (confirmedIdx !== null)
    annotations[confirmedIdx] = (
      <div
        className="absolute bg-orange-300 left-0 right-0 text-center py-0.5 text-xs"
        style={{ top: tileHeight + 8 }}
      >
        Me
      </div>
    );
  return annotations;
};

export default function Scenario2D({
  questionId,
  scenario,
  settings,
  onSubmit,
}: Scenario2DProps) {
  const { hand: serializedHand, handNumber, seat, dora, turn } = scenario;
  const { endDate } = settings;

  const [doRiichi, setDoRiichi] = useState(false);

  const [ref, { width, height }] = useMeasure<HTMLDivElement>();
  const tileWidth = computeTileWidth(width, height);
  const tileHeight = getHeightFromWidth(tileWidth);

  const [selectedTileIdx, setSelectedTileIdx] = useState<number | null>(null);
  const [confirmedTileIdx, setConfirmedTileIdx] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState('');

  const hand = {
    tiles: mpszHandResolver.parse(serializedHand.tiles),
    draw: scenario.hand.draw
      ? mpszTileResolver.parse(serializedHand.draw)
      : undefined,
    calls: [],
  };

  const handleConfirm = async (idx: number) => {
    const discard = idx < 0 ? 'tsumogiri' : toMpsz(hand.tiles[idx]);
    try {
      await onSubmit({
        action: doRiichi ? 'riichi' : 'none',
        discard,
      });
      setConfirmedTileIdx(idx);
      setErrorMessage('');
    } catch (e) {
      if (typeof e === 'object' && e !== null && 'message' in e)
        setErrorMessage(e.message as string);
    }
  };

  const handleToggleRiichi = () => {
    if (confirmedTileIdx === null) setDoRiichi(!doRiichi);
  };

  useEffect(() => {
    setSelectedTileIdx(null);
    setConfirmedTileIdx(null);
    setDoRiichi(false);
    setErrorMessage('');
  }, [questionId]);

  return (
    <div ref={ref} className="bg-green-700 h-full w-full px-4 py-4">
      <div className="w-full max-w-6xl m-auto">
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
          <Instruction
            tiles={hand.tiles}
            tileWidth={tileWidth / 3}
            doRiichi={doRiichi}
            selectedTileIdx={selectedTileIdx}
            confirmedTileIdx={confirmedTileIdx}
          />
        </div>
        <div className="text-center text-red-800">{errorMessage}</div>
        <div className="grow" />
        <div className="flex flex-row justify-end my-8 gap-2">
          <div
            className={clsx(
              'text-2xl px-2 py-2 min-w-24 text-center cursor-pointer',
              'bg-orange-900 text-orange-400 hover:bg-orange-800',
            )}
            onClick={handleToggleRiichi}
          >
            Riichi: {doRiichi ? 'Yes' : 'No'}
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
            selectedTileIdx={selectedTileIdx}
            onSelect={setSelectedTileIdx}
            confirmedTileIdx={confirmedTileIdx}
            onConfirm={handleConfirm}
            annotationBottom={createAnnotationsBottom(
              confirmedTileIdx,
              tileHeight,
            )}
          />
        </div>
      </div>
    </div>
  );
}
