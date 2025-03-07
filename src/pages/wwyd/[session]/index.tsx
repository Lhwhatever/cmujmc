import * as Mahjong from '../../../utils/mahjong/tiles';
import { Tile } from '../../../utils/mahjong/tiles';
import { useState } from 'react';
import Page from '../../../components/Page';
import Scenario2D from '../../../components/hand/Scenario2D';
import clsx from 'clsx';
import { XMarkIcon } from '@heroicons/react/24/solid';

export default function Wwyd() {
  const [bannerHidden, setBannerHidden] = useState(false);

  const scenario = {
    hand: {
      tiles: Mahjong.parseMpsz('123p123s78s44z'),
      draw: Mahjong.parseMpsz('2m')[0],
      calls: [
        {
          type: 'chii',
          discard: Mahjong.Tile.TILE_2M,
          support: [Tile.TILE_1M, Tile.TILE_3M],
        },
      ],
    } as Mahjong.Hand,
    handNumber: {
      prevalentWind: Mahjong.SeatWind.EAST,
      dealerNumber: 1,
      honba: 0,
    } as Mahjong.HandNumber,
    turn: 7,
    seat: Mahjong.SeatWind.SOUTH,
    dora: [Mahjong.Tile.TILE_1M, Mahjong.Tile.TILE_2M],
  };

  const [endDate, _] = useState(() => new Date(Date.now() + 45000));
  const settings = {
    endDate,
  };

  const options = {
    riichi: [Tile.TILE_2M],
  };

  return (
    <Page className="mt-8 h-[calc(100dvh-2rem)] sm:mt-12 sm:h-[calc(100dvh-3rem)] lg:mt-16 lg:h-[calc(100dvh-4rem)] box-border">
      <div
        className={clsx(
          'absolute bg-yellow-400 p-4 top-16 w-dvw sm:invisible flex flex-row z-50',
          bannerHidden && 'invisible',
        )}
      >
        <div className="p-1">
          Your screen may be too narrow to display the following content well.
          Try changing to landscape mode or using another device.
        </div>
        <button className="p-1" onClick={() => setBannerHidden(true)}>
          <XMarkIcon height={36} />
        </button>
      </div>
      <Scenario2D scenario={scenario} settings={settings} options={options} />
    </Page>
  );
}

Wwyd.auth = {
  role: 'user',
};
