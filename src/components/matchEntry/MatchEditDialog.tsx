import Dialog from 'components/Dialog';
import { Suspense, useState } from 'react';
import Loading from '../Loading';
import { trpc } from '../../utils/trpc';
import { ScoreEntryForm, ScoreEntryOnNext } from './ScoreEntryForm';
import MatchPlayerForm, { MatchPlayerFormOnNext } from './MatchPlayerForm';

import { MatchPlayerFormData, ScoreEntryFormData } from './types';
import ChomboForm, { ChomboFormOnNext } from './ChomboForm';
import { userOptionToParam } from 'components/UserComboBox';

interface MatchEditContentsProps {
  leagueId: number;
  matchId: number;
  onClose: () => void;
}

const MatchEditContents = ({
  leagueId,
  matchId,
  onClose,
}: MatchEditContentsProps) => {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [{ match }] = trpc.matches.getById.useSuspenseQuery(matchId);
  const utils = trpc.useUtils();

  const [matchPlayerFormData, setMatchPlayerFormData] =
    useState<MatchPlayerFormData | null>(null);
  const [scoreEntryData, setScoreEntryData] =
    useState<ScoreEntryFormData | null>(null);

  const handlePlayerFormNext: MatchPlayerFormOnNext = (formData, onSuccess) => {
    setMatchPlayerFormData(formData);
    onSuccess();
    setStage(2);
  };

  const mergedMatch = matchPlayerFormData
    ? ({
        ...match,
        players: match.players.map((player, index) => {
          const option = matchPlayerFormData.players[index];
          switch (option.type) {
            case 'registered':
              return {
                ...player,
                player: option.payload,
                unregisteredPlaceholder: null,
              };
            case 'unregistered':
              return {
                ...player,
                player: null,
                unregisteredPlaceholder: option.payload,
              };
          }
        }),
      } as typeof match)
    : match;

  const handleScoreEntryNext: ScoreEntryOnNext = (data, onSuccess) => {
    setScoreEntryData(data);
    onSuccess();
    setStage(3);
  };

  const editMatchMutation = trpc.matches.editMatch.useMutation();

  const handleChomboFormNext: ChomboFormOnNext = (data) => {
    if (matchPlayerFormData !== null && scoreEntryData !== null) {
      editMatchMutation.mutate(
        {
          matchId: match.id,
          players: scoreEntryData.players.map((score, index) => ({
            player: userOptionToParam(matchPlayerFormData.players[index]),
            score,
            chombos: data?.at(index),
          })),
          leftoverBets: scoreEntryData.leftoverBets,
          time: matchPlayerFormData.time,
          commit: data !== undefined,
        },
        {
          async onSuccess() {
            setStage(1);
            onClose();
            await Promise.all([
              utils.matches.getCompletedByLeague.invalidate(leagueId),
              utils.matches.getIncompleteByEvent.invalidate(leagueId),
              utils.leagues.scoreHistory.invalidate(leagueId),
            ]);
          },
          async onError(error) {
            alert(error.message);
            setStage(1);
          },
        },
      );
    }
  };

  return (
    <>
      <MatchPlayerForm
        hidden={stage !== 1}
        operation={{
          type: 'update',
          match,
        }}
        onPrev={onClose}
        onNext={handlePlayerFormNext}
      />
      <ScoreEntryForm
        hidden={stage !== 2}
        targetMatch={mergedMatch}
        onPrev={() => setStage(1)}
        onNext={handleScoreEntryNext}
      />
      <ChomboForm
        hidden={stage !== 3}
        targetMatch={mergedMatch}
        onPrev={() => setStage(2)}
        onNext={handleChomboFormNext}
      />
    </>
  );
};

export interface MatchEditFormProps {
  leagueId: number;
  matchId: number | null;
  onClose: () => void;
}

const MatchEditDialog = ({
  leagueId,
  matchId,
  onClose,
}: MatchEditFormProps) => {
  return (
    <Dialog open={matchId !== null} onClose={onClose} title="Update Match">
      {matchId && (
        <Suspense fallback={<Loading />}>
          <MatchEditContents
            leagueId={leagueId}
            matchId={matchId}
            onClose={onClose}
          />
        </Suspense>
      )}
    </Dialog>
  );
};

export default MatchEditDialog;
