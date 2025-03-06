import * as Mahjong from '../../../utils/mahjong/tiles';
import { Tile } from '../../../utils/mahjong/tiles';
import { useState } from 'react';
import Page from '../../../components/Page';
import Scenario2D from '../../../components/hand/Scenario2D';

export default function Wwyd() {
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
    <Page className="mt-12 h-[calc(100dvh-3rem)] sm:mt-16 sm:h-[calc(100dvh-4rem)] box-border">
      <Scenario2D
        scenario={scenario}
        settings={settings}
        tileWidth={36}
        options={options}
      />
    </Page>
  );
}
