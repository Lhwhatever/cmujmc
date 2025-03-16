import Dialog from '../Dialog';
import { trpc } from '../../utils/trpc';
import { RankedEvent } from '../display/RankedEventDetails';
import { ScoreEntryForm, ScoreEntryOnNext } from './ScoreEntryForm';
import MatchPlayerForm, { MatchPlayerFormOnNext } from './MatchPlayerForm';
import { userOptionToParam } from '../UserComboBox';
import { RankedMatch, ScoreEntryFormData } from './types';
import { useState } from 'react';
import ChomboForm, { ChomboFormOnNext } from './ChomboForm';

export interface MatchEntryDialogProps {
  leagueId: number;
  targetEvent: RankedEvent | null;
  setTargetEvent: (_: RankedEvent | null) => void;
  targetMatch: RankedMatch | null;
  setTargetMatch: (_: RankedMatch | null) => void;
}

export default function MatchEntryDialog({
  leagueId,
  targetEvent,
  setTargetEvent,
  targetMatch,
  setTargetMatch,
}: MatchEntryDialogProps) {
  const utils = trpc.useUtils();
  const handleClose = () => {
    setTargetEvent(null);
    setTargetMatch(null);
  };

  const [matchEditStage, setMatchEditStage] = useState<1 | 2>(1);

  const [scoreEntryHandle, setScoreEntryHandle] = useState<{
    data: ScoreEntryFormData;
    onError: (messages: string[]) => void;
  } | null>(null);

  const createMatchMutation = trpc.matches.create.useMutation();
  const editMatchMutation = trpc.matches.editMatch.useMutation();

  const handleCreateMatch: MatchPlayerFormOnNext = (
    { players, time },
    onSuccess,
    onError,
  ) => {
    if (targetEvent !== null) {
      createMatchMutation.mutate(
        {
          eventId: targetEvent.id,
          players: players.map(userOptionToParam),
          time,
        },
        {
          onSuccess({ match }) {
            onSuccess();
            void utils.matches.getIncompleteByEvent.invalidate(targetEvent.id);
            setTargetMatch(match);
          },
          onError(e) {
            if (e.data?.zodError) {
              onError(
                Object.values(e.data.zodError.fieldErrors).flatMap(
                  (e) => e ?? [],
                ),
              );
            } else {
              onError([e.message]);
            }
          },
        },
      );
    }
  };

  const handleScoreEntryNext: ScoreEntryOnNext = (data, onSuccess, onError) => {
    setScoreEntryHandle({ data, onError });
    onSuccess();
    setMatchEditStage(2);
  };

  const handleChomboFormNext: ChomboFormOnNext = (data) => {
    if (targetMatch !== null && scoreEntryHandle !== null) {
      editMatchMutation.mutate(
        {
          matchId: targetMatch.id,
          players: scoreEntryHandle.data.players.map((score, index) => ({
            score,
            chombos: data?.at(index),
          })),
          leftoverBets: scoreEntryHandle.data.leftoverBets,
          commit: data !== undefined,
        },
        {
          async onSuccess() {
            setMatchEditStage(1);
            handleClose();
            await Promise.all([
              utils.matches.getCompletedByLeague.invalidate(leagueId),
              utils.matches.getIncompleteByEvent.invalidate(leagueId),
              utils.leagues.scoreHistory.invalidate(leagueId),
            ]);
          },
          async onError(error) {
            scoreEntryHandle.onError([error.message]);
            setMatchEditStage(1);
          },
        },
      );
    } else {
      alert('Error: Illegal state!');
    }
  };

  return (
    <Dialog
      open={targetEvent !== null}
      onClose={handleClose}
      title="Record Match"
    >
      {targetEvent !== null && (
        <>
          <MatchPlayerForm
            operation={{
              type: 'create',
              event: targetEvent,
            }}
            hidden={targetMatch !== null}
            onPrev={handleClose}
            onNext={handleCreateMatch}
          />
          {targetMatch && (
            <>
              <ScoreEntryForm
                hidden={matchEditStage !== 1}
                targetMatch={targetMatch}
                onPrev={handleClose}
                onNext={handleScoreEntryNext}
              />
              <ChomboForm
                hidden={matchEditStage !== 2}
                targetMatch={targetMatch}
                onPrev={() => setMatchEditStage(1)}
                onNext={handleChomboFormNext}
              />
            </>
          )}
        </>
      )}
    </Dialog>
  );
}
