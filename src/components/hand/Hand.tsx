import * as MahjongTiles from '../../utils/mahjong/tiles';
import Tile, { getHeightFromWidth } from './Tile';
import { CSSProperties, ReactNode, useState } from 'react';

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
  selectedTileIdx: number | null;
  onSelect: (idx: number | null) => void;
  confirmedTileIdx: number | null;
  onConfirm: (idx: number) => void;
  annotationBottom?: Record<number, ReactNode>;
}

const createStyles = (
  validOption: boolean,
  translateYPct: number,
): CSSProperties => ({
  cursor: validOption ? 'pointer' : undefined,
  filter: validOption ? undefined : 'saturate(50%) brightness(50%)',
  translate: `0 ${translateYPct}%`,
});

export default function Hand({
  hand,
  tileWidth,
  options,
  confirmedTileIdx,
  onConfirm,
  selectedTileIdx,
  onSelect,
  annotationBottom = {},
}: HandProps) {
  const [hovererdTileIdx, setHoveredTileIdx] = useState<number | null>(null);
  const tileHeight = getHeightFromWidth(tileWidth);

  const getTileAt = (index: number): MahjongTiles.Tile => {
    if (index >= 0) return hand.tiles[index];
    if (hand.draw === undefined) throw Error('no draw');
    return hand.draw;
  };

  const isValidOption = (index: number): boolean => {
    return (
      confirmedTileIdx === null && (options?.has(getTileAt(index)) ?? true)
    );
  };

  const addTileHandlers = (index: number) => ({
    onMouseEnter: () => {
      if (isValidOption(index)) setHoveredTileIdx(index);
    },
    onMouseLeave: () => setHoveredTileIdx(null),
    onClick: () => {
      if (index === selectedTileIdx) {
        onConfirm(index);
        onSelect(null);
      } else if (isValidOption(index)) {
        onSelect(index);
      } else {
        onSelect(null);
      }
    },
    style: {
      translate: `0 ${
        index === hovererdTileIdx ? Math.round(-0.1 * tileHeight) : 0
      }px`,
      cursor: 'pointer',
    },
  });

  const getTranslateY = (index: number): number =>
    index === hovererdTileIdx || index === selectedTileIdx ? -20 : 0;

  const tilesAndIndices = [
    ...hand.tiles.map(
      (tile, index) => [tile, index] as [MahjongTiles.Tile, number],
    ),
    ...(hand.draw !== undefined
      ? [[hand.draw, -1] as [MahjongTiles.Tile, number]]
      : []),
  ];

  return (
    <div className="flex flex-row flex-wrap gap-1">
      {tilesAndIndices.map(([tile, index]) => (
        <div className="relative" key={index}>
          <Tile
            tile={tile}
            tileWidth={tileWidth}
            {...addTileHandlers(index)}
            style={{
              ...createStyles(isValidOption(index), getTranslateY(index)),
              marginLeft: index < 0 ? tileWidth : 0,
            }}
          />
          {annotationBottom[index]}
        </div>
      ))}

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
