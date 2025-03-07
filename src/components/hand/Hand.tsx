import * as MahjongTiles from '../../utils/mahjong/tiles';
import Tile, { getHeightFromWidth } from './Tile';
import { CSSProperties, useState } from 'react';

interface CallProps {
  call: MahjongTiles.Call;
  tileWidth: number;
  tileHeight: number;
}

const Call = ({ call, tileWidth, tileHeight }: CallProps) => {
  const halfSpacing = 2;
  const halfDifference = (tileHeight - tileWidth) / 2;

  switch (call.type) {
    case 'chii':
      return (
        <div
          className="flex flex-row gap-1"
          style={{
            paddingLeft: tileHeight - tileWidth,
          }}
        >
          <Tile
            tile={call.discard}
            tileWidth={tileWidth}
            style={{
              rotate: '90deg',
              translate: `-${halfDifference}px ${halfDifference}px`,
            }}
          />
          <Tile tile={call.support[0]} tileWidth={tileWidth} style={{}} />
          <Tile tile={call.support[1]} tileWidth={tileWidth} style={{}} />
        </div>
      );
    case 'pon': {
      const calledTileX =
        (1 - call.source) * (tileWidth + halfSpacing * 2) +
        halfDifference -
        halfSpacing;

      return (
        <div
          className="flex flex-row gap-1"
          style={{
            paddingRight: tileHeight - tileWidth,
          }}
        >
          <Tile
            tile={call.support[0]}
            tileWidth={tileWidth}
            style={{
              translate: call.source > 2 ? tileHeight : 0,
            }}
          />
          <Tile
            tile={call.support[1]}
            tileWidth={tileWidth}
            style={{
              translate: call.source > 1 ? tileHeight : 0,
            }}
          />
          <Tile
            tile={call.discard}
            tileWidth={tileWidth}
            style={{
              rotate: '90deg',
              translate: `${calledTileX}px ${halfDifference}px`,
            }}
          />
        </div>
      );
    }
    case 'ankan': {
      return (
        <div
          className="flex flex-row gap-1"
          style={{
            paddingRight: tileHeight - tileWidth,
          }}
        >
          <Tile tileWidth={tileWidth} />
          <Tile tile={call.tile[0]} tileWidth={tileWidth} />
          <Tile tile={call.tile[1]} tileWidth={tileWidth} />
          <Tile tileWidth={tileWidth} />
        </div>
      );
    }
    case 'daiminkan': {
      const tiles = [0, -2, -3][call.source - 1];
      const calledTileX =
        tiles * (tileWidth + halfSpacing * 2) + halfDifference - halfSpacing;

      return (
        <div
          className="flex flex-row gap-1"
          style={{
            paddingRight: tileHeight - tileWidth,
          }}
        >
          <Tile
            tile={call.support[0]}
            tileWidth={tileWidth}
            style={{
              translate: call.source > 2 ? tileHeight : 0,
            }}
          />
          <Tile
            tile={call.support[1]}
            tileWidth={tileWidth}
            style={{
              translate: call.source > 1 ? tileHeight : 0,
            }}
          />
          <Tile
            tile={call.support[2]}
            tileWidth={tileWidth}
            style={{
              translate: call.source > 1 ? tileHeight : 0,
            }}
          />
          <Tile
            tile={call.discard}
            tileWidth={tileWidth}
            style={{
              rotate: '90deg',
              translate: `${calledTileX}px ${halfDifference}px`,
            }}
          />
        </div>
      );
    }
    case 'shouminkan': {
      const calledTileX =
        (1 - call.source) * (tileWidth + halfSpacing * 2) + halfDifference - 1;
      const kanTileX =
        -call.source * (tileWidth + halfSpacing * 2) + halfDifference - 1;
      const kanTileY = halfDifference - (tileWidth + halfSpacing * 2);

      return (
        <div
          className="flex flex-row gap-1"
          style={{
            marginRight: -(tileWidth * 2 - tileHeight - halfSpacing * 2),
          }}
        >
          <Tile
            tile={call.support[0]}
            tileWidth={tileWidth}
            style={{
              translate: call.source > 2 ? tileHeight : 0,
            }}
          />
          <Tile
            tile={call.support[1]}
            tileWidth={tileWidth}
            style={{
              translate: call.source > 1 ? tileHeight : 0,
            }}
          />
          <Tile
            tile={call.discard}
            tileWidth={tileWidth}
            style={{
              rotate: '90deg',
              translate: `${calledTileX}px ${halfDifference}px`,
            }}
          />
          <Tile
            tile={call.kanTile}
            tileWidth={tileWidth}
            style={{
              rotate: '90deg',
              translate: `${kanTileX}px ${kanTileY}px`,
            }}
          />
        </div>
      );
    }
  }
};

export interface HandProps {
  hand: MahjongTiles.Hand;
  options?: Set<MahjongTiles.Tile>;
  tileWidth: number;
}

const createStyles = (
  validOption: boolean,
  translateYPct: number,
): CSSProperties => ({
  cursor: validOption ? 'pointer' : undefined,
  filter: validOption ? undefined : 'saturate(10%) brightness(60%)',
  translate: `0 ${translateYPct}%`,
});

export default function Hand({ hand, tileWidth, options }: HandProps) {
  const tileHeight = getHeightFromWidth(tileWidth);

  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);

  const getTileAt = (index: number): MahjongTiles.Tile => {
    if (index >= 0) return hand.tiles[index];
    if (hand.draw === undefined) throw Error('no draw');
    return hand.draw;
  };

  const isValidOption = (index: number): boolean => {
    return options?.has(getTileAt(index)) ?? true;
  };

  const addTileHandlers = (index: number) => ({
    onMouseEnter: () => {
      if (isValidOption(index)) setHoveredTile(index);
    },
    onMouseLeave: () => setHoveredTile(null),
    onClick: () => {
      if (index === selectedTile) {
        // TODO
        console.log(`Double selected tile ${index}`);
      } else if (isValidOption(index)) {
        console.log(`Selected tile ${index}`);
        setSelectedTile(index);
      } else {
        setSelectedTile(null);
      }
    },
    style: {
      translate: `0 ${
        index === hoveredTile ? Math.round(-0.1 * tileHeight) : 0
      }px`,
      cursor: 'pointer',
    },
  });

  const getTranslateY = (index: number): number =>
    index === hoveredTile || index === selectedTile ? -10 : 0;

  return (
    <div className="flex flex-row flex-wrap h-[48px] gap-1">
      {hand.tiles.map((tile, index) => (
        <Tile
          tile={tile}
          key={index}
          tileWidth={tileWidth}
          {...addTileHandlers(index)}
          style={createStyles(isValidOption(index), getTranslateY(index))}
        />
      ))}
      {hand.draw && (
        <Tile
          tile={hand.draw}
          tileWidth={tileWidth}
          {...addTileHandlers(-1)}
          style={{
            ...createStyles(isValidOption(-1), getTranslateY(-1)),
            marginLeft: tileWidth,
          }}
        />
      )}
      <div className="grow flex flex-row-reverse gap-2">
        {hand.calls?.map((call, index) => (
          <Call
            call={call}
            key={index}
            tileWidth={tileWidth}
            tileHeight={tileHeight}
          />
        ))}
      </div>
    </div>
  );
}
