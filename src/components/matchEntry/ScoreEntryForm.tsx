import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sumTableScores } from '../../utils/scoring';
import { Fieldset } from '@headlessui/react';
import clsx from 'clsx';
import MatchPlayerName from '../display/MatchPlayerName';
import InputField from '../form/InputField';
import Button from '../Button';
import StickInput from './StickInput';

import { RankedMatch, ScoreEntryFormData, scoreEntrySchema } from './types';

export type ScoreEntryOnNext = (
  data: ScoreEntryFormData,
  onSuccess: () => void,
  onError: (messages: string[]) => void,
) => void;

export interface ScoreEntryFormProps {
  targetMatch: RankedMatch;
  onPrev: () => void;
  onNext: ScoreEntryOnNext;
  hidden?: boolean;
}

export const ScoreEntryForm = ({
  targetMatch,
  onPrev,
  onNext,
  hidden,
}: ScoreEntryFormProps) => {
  const numPlayers = targetMatch.players.length;
  const { startPts } = targetMatch.ruleset;
  const expectedTotal = numPlayers * startPts;

  const [stickInputTarget, setStickInputTarget] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const { register, formState, watch, handleSubmit, setValue } = useForm({
    mode: 'onChange',
    resolver: zodResolver(scoreEntrySchema),
    defaultValues: {
      players: targetMatch.players.map(({ rawScore }) => rawScore ?? startPts),
      leftoverBets: 0,
    },
  });

  const players = watch('players');
  const leftoverBets = watch('leftoverBets');
  const sum = sumTableScores(players, leftoverBets);
  const sumCorrect = sum === expectedTotal;

  const handleNext = handleSubmit((data) => {
    if (sumCorrect) {
      onNext(data, () => setErrors([]), setErrors);
    }
  });

  return (
    <div className={clsx(hidden && 'hidden')}>
      <Fieldset
        className={clsx(
          'flex flex-col space-y-4',
          stickInputTarget !== null && 'hidden',
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
        {errors.map((error, index) => (
          <div key={index} className="text-xs text-red-500">
            {error}
          </div>
        ))}
        <div className="flex flex-row gap-2">
          <Button color="red" fill="filled" onClick={onPrev}>
            Cancel
          </Button>
          <Button
            color="green"
            fill="outlined"
            disabled={!sumCorrect}
            onClick={handleNext}
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
    </div>
  );
};
