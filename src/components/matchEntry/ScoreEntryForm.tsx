import { z } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { trpc } from '../../utils/trpc';
import { sumTableScores } from '../../utils/scoring';
import { Fieldset } from '@headlessui/react';
import clsx from 'clsx';
import MatchPlayerName from '../display/MatchPlayerName';
import InputField from '../form/InputField';
import Button from '../Button';
import StickInput from './StickInput';
import { ChomboEntryForm } from './ChomboEntryForm';
import { RankedMatch } from './MatchEntryDialog';
import ChomboAffirmationForm from './ChomboAffirmationForm';
import { useSession } from 'next-auth/react';

const scoreEntrySchema = z.object({
  players: z.array(z.number().multipleOf(100)),
  leftoverBets: z.number().multipleOf(1000).min(0),
});

export interface ScoreEntryFormProps {
  leagueId: number;
  targetMatch: RankedMatch;
  onClose: () => void;
}

export const ScoreEntryForm = ({
  leagueId,
  targetMatch,
  onClose,
}: ScoreEntryFormProps) => {
  const session = useSession();
  const numPlayers = targetMatch.players.length;
  const { startPts } = targetMatch.ruleset;
  const expectedTotal = numPlayers * startPts;

  const [stickInputTarget, setStickInputTarget] = useState<number | null>(null);
  const [chomboEntryStage, setChomboEntryStage] = useState(false);

  const { register, formState, watch, handleSubmit, getValues, setValue } =
    useForm({
      mode: 'onChange',
      resolver: zodResolver(scoreEntrySchema),
      defaultValues: {
        players: targetMatch.players.map(
          ({ rawScore }) => rawScore ?? startPts,
        ),
        leftoverBets: 0,
      },
    });

  const utils = trpc.useUtils();
  const players = watch('players');
  const leftoverBets = watch('leftoverBets');
  const sum = sumTableScores(players, leftoverBets);
  const sumCorrect = sum === expectedTotal;
  const handleContinue = () => {
    void handleSubmit(() => {
      if (sumCorrect) setChomboEntryStage(true);
    })();
  };

  const editMatchMutation = trpc.matches.editMatch.useMutation({
    onSuccess() {
      onClose();
      return Promise.all([
        utils.matches.getIncompleteByEvent.invalidate(),
        utils.matches.getCompletedByLeague.invalidate(leagueId),
        utils.leagues.invalidate(),
      ]);
    },
    onError(e) {
      console.error(e);
    },
  });

  const handleComplete = (chombos?: [number, string][]) => {
    editMatchMutation.mutate({
      matchId: targetMatch.id,
      leftoverBets: getValues('leftoverBets'),
      players: getValues('players').map((score, index) => ({
        score,
        chombos: chombos?.flatMap(([player, desc]) =>
          player === index ? [desc] : [],
        ),
      })),
      commit: chombos !== undefined,
    });
  };

  return (
    <>
      <Fieldset
        className={clsx(
          'flex flex-col space-y-4',
          (chomboEntryStage || stickInputTarget !== null) && 'hidden',
        )}
      >
        {targetMatch.players.map((player, index) => (
          <div key={index} className="flex flex-col">
            <div className="text-sm font-bold">
              Player {index + 1}: <MatchPlayerName {...player} />
            </div>
            <InputField
              label="Score"
              name={`players.${index}`}
              type="number"
              step={100}
              register={register}
              errors={formState.errors}
              defaultValue={startPts}
              required
              rightButton={
                <Button
                  color="blue"
                  fill="filled"
                  roundSided="right"
                  onClick={() => setStickInputTarget(index)}
                >
                  Sticks
                </Button>
              }
            />
          </div>
        ))}
        <div className="flex flex-col">
          <div className="text-sm font-bold">Leftover Riichi Sticks*</div>
          <InputField
            register={register}
            errors={formState.errors}
            type="number"
            step={1000}
            min={0}
            name="leftoverBets"
            required
          />
        </div>
        <div className="flex flex-col">
          <div className="text-sm font-bold">
            Total Score (Current/Expected)
          </div>
          <div className={sum === expectedTotal ? '' : 'text-red-500'}>
            {sum} / {expectedTotal}
          </div>
        </div>
        <div className="flex flex-row gap-2">
          <Button color="red" fill="filled" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="green"
            fill="outlined"
            disabled={!sumCorrect}
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      </Fieldset>
      {stickInputTarget !== null && (
        <div className="flex flex-col">
          <div className="text-md font-bold mb-4">
            Player {stickInputTarget}:{' '}
            <MatchPlayerName {...targetMatch.players[stickInputTarget]} />
          </div>
          <StickInput
            onChange={(value) => setValue(`players.${stickInputTarget}`, value)}
            pointStickStyle="modern"
          />
          <div className="text-md font-bold mt-4">
            Total = {players[stickInputTarget]}
          </div>
          <div>
            <Button
              color="green"
              fill="outlined"
              onClick={() => setStickInputTarget(null)}
            >
              Done
            </Button>
          </div>
        </div>
      )}
      {session?.data?.user?.role === 'admin' ? (
        <ChomboEntryForm
          players={targetMatch.players}
          hidden={!chomboEntryStage}
          onBack={() => setChomboEntryStage(false)}
          onSubmit={handleComplete}
        />
      ) : (
        <ChomboAffirmationForm
          hidden={!chomboEntryStage}
          onBack={() => setChomboEntryStage(false)}
          onSubmit={handleComplete}
        />
      )}
    </>
  );
};
