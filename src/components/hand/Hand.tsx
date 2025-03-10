import * as MahjongTiles from '../../utils/mahjong/tiles';
import Tile, { getHeightFromWidth } from './Tile';
import { CSSProperties, ReactNode, useState } from 'react';
import clsx from 'clsx';

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

interface AnnotationColorGroup {
  subject: string;
  item: string;
}

const annotationColors = {
  yellow: {
    subject: 'bg-yellow-400',
    item: 'bg-yellow-200',
  } as AnnotationColorGroup,
  gray: {
    subject: 'bg-gray-400',
    item: 'bg-gray-200',
  } as AnnotationColorGroup,
};

const sortAnnotations = (
  annotations: Annotation[],
): Map<Annotation['align'], Annotation[]> => {
  const map = new Map<Annotation['align'], Annotation[]>();
  for (const annotation of annotations) {
    if (!map.has(annotation.align)) {
      map.set(annotation.align, []);
    }
    map.get(annotation.align)?.push(annotation);
  }
  return map;
};

export interface Annotation {
  subject: string;
  align: 'top' | 'bottom';
  color: keyof typeof annotationColors;
  items?: [string, string][];
}

interface AnnotationsProp {
  annotations: Annotation[];
  tileHeight: number;
}

const Annotations = ({ annotations, tileHeight }: AnnotationsProp) => {
  return (
    <>
      {sortAnnotations(annotations)
        .entries()
        .map(
          ([alignment, annotations]) =>
            annotations.length > 0 && (
              <div
                key={alignment}
                className="flex flex-col gap-4 absolute left-0 right-0"
                style={{
                  top: alignment === 'bottom' ? tileHeight + 8 : undefined,
                  bottom: alignment === 'top' ? tileHeight + 8 : undefined,
                }}
              >
                {annotations.map((annotation) => (
                  <div
                    className="flex flex-col text-center text-xs"
                    key={annotation.subject}
                  >
                    <div className={annotationColors[annotation.color].subject}>
                      {annotation.subject}
                    </div>
                    {annotation.items?.map(([left, right], index) => (
                      <div
                        key={index}
                        className={clsx(
                          'flex flex-row justify-between px-[1px]',
                          annotationColors[annotation.color].item,
                        )}
                      >
                        <div className="align-left">{left}</div>
                        <div className="align-right">{right}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ),
        )}
    </>
  );
};

export interface HandProps {
  hand: MahjongTiles.Hand;
  options?: Set<MahjongTiles.Tile>;
  tileWidth: number;
  selectedTileIdx: number | null;
  onSelect: (idx: number | null) => void;
  confirmedTileIdx: number | null;
  onConfirm: (idx: number) => void;
  annotations?: Map<number, Annotation[]>;
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
  annotations,
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
        <div
          className="relative"
          key={index}
          style={{
            marginLeft: index < 0 ? tileWidth : 0,
          }}
        >
          <Tile
            tile={tile}
            tileWidth={tileWidth}
            {...addTileHandlers(index)}
            style={createStyles(isValidOption(index), getTranslateY(index))}
          />
          <Annotations
            annotations={annotations?.get(index) ?? []}
            tileHeight={tileHeight}
          />
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
