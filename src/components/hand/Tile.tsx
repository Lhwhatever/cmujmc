import * as Mahjong from '../../utils/mahjong/tiles';
import { ReactSVG } from 'react-svg';
import { CSSProperties, MouseEventHandler, ReactNode } from 'react';

export interface TileProps {
  tile?: Mahjong.Tile;
  tileWidth?: number;
  style?: CSSProperties;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: MouseEventHandler<HTMLDivElement>;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

const prefix =
  'https://raw.githubusercontent.com/FluffyStuff/riichi-mahjong-tiles/refs/heads/master/Regular';

const getFluffyStuffName = (tile: Mahjong.Tile): string => {
  const tileNumber = Mahjong.getTileNumber(tile);
  const akadoraSuffix = Mahjong.isAkadora(tile) ? '-Dora' : '';

  switch (Mahjong.getSuit(tile)) {
    case Mahjong.Suit.MAN:
      return 'Man' + tileNumber + akadoraSuffix;
    case Mahjong.Suit.PIN:
      return 'Pin' + tileNumber + akadoraSuffix;
    case Mahjong.Suit.SOU:
      return 'Sou' + tileNumber + akadoraSuffix;
    case Mahjong.Suit.KAZE:
      switch (tileNumber) {
        case 0:
          return 'Ton';
        case 1:
          return 'Nan';
        case 2:
          return 'Shaa';
        case 3:
          return 'Pei';
        default:
          throw new Error(`Unrecognized tileNumber for wind: ${tileNumber}`);
      }
    case Mahjong.Suit.SANGEN:
      switch (tileNumber) {
        case 0:
          return 'Haku';
        case 1:
          return 'Hatsu';
        case 2:
          return 'Chun';
        default:
          throw new Error(`Unrecognized tileNumber for sangen: ${tileNumber}`);
      }
  }
};

export const getHeightFromWidth = (width: number) =>
  Math.round((width * 4) / 3);

const getInjector = (width: number) => (svg: SVGSVGElement) => {
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(getHeightFromWidth(width)));
};

const Tile = ({
  tile,
  tileWidth,
  style,
  onMouseLeave,
  onMouseEnter,
  onClick,
}: TileProps) => {
  const fluffyStuffName =
    tile === undefined ? 'Back' : getFluffyStuffName(tile);
  const injector = getInjector(tileWidth ?? 60);

  const containerStyle = {
    position: 'relative' as CSSProperties['position'],
    ...style,
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <ReactSVG afterInjection={injector} src={`${prefix}/Front.svg`} />
      <ReactSVG
        afterInjection={injector}
        className="absolute top-0 left-0"
        src={`${prefix}/${fluffyStuffName}.svg`}
        title={fluffyStuffName}
      />
    </div>
  );
};

export default Tile;
