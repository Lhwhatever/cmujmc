import React, { useState } from 'react';
import Dialog from '../Dialog';
import { Fieldset } from '@headlessui/react';
import UserComboBox, { User, UserOption } from '../UserComboBox';
import Button from '../Button';
import { RouterOutputs, trpc } from '../../utils/trpc';
import { GameMode } from '@prisma/client';
import { getNumPlayers } from '../../utils/gameModes';
import { RankedEvent } from './RankedEventDetails';
import InputField from '../form/InputField';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import TextareaField from '../form/TextareaField';
import SelectField from '../form/SelectField';
import Text from '../Text';
import { TrashIcon } from '@heroicons/react/24/solid';
import { sumTableScores } from '../../utils/scoring';
import MatchPlayerName from './MatchPlayerName';
import { renderPlayerName } from '../../utils/maskNames';

type MatchCreationResult = RouterOutputs['matches']['create'];
export type RankedMatch = NonNullable<
  RouterOutputs['matches']['getById']['match']
>;

type MatchCreationFormProps = {
  eventId: number;
  gameMode: GameMode;
  onRefresh: () => void;
  onClose: () => void;
  onSuccess: (m: MatchCreationResult) => void;
  users: User[] | null;
  hidden?: boolean;
};

const MatchCreationForm = ({
  gameMode,
  onClose,
  onRefresh,
  onSuccess,
  users,
  eventId,
  hidden,
}: MatchCreationFormProps) => {
  const [players, setPlayers] = useState(
    () =>
      new Array(getNumPlayers(gameMode)).fill(null) as (UserOption | null)[],
  );
  const updateUser = (i: number) => (player: UserOption | null) => {
    setPlayers(players.map((p, j) => (i === j ? player : p)));
  };
  const [errors, setErrors] = useState('');

  const createMatch = trpc.matches.create.useMutation();

  const handleSubmit = async () => {
    if (players.every((p) => p !== null)) {
      try {
        onSuccess(
          await createMatch.mutateAsync(
            {
              eventId,
              players: players.map(({ type, payload }) => ({
                type,
                payload: type === 'registered' ? payload.id : payload,
              })),
            },
            {
              onError(error) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
                  setErrors(JSON.parse(error.message)[0].message);
                } catch (e) {
                  console.error(e);
                }
              },
            },
          ),
        );
      } catch (e) {}
    } else {
      setErrors('');
    }
  };

  const outerClass = hidden ? 'hidden' : '';

  return (
    <div className={outerClass}>
      <Fieldset className="space-y-6">
        {players.map((player, index) => (
          <UserComboBox
            key={index}
            label={`Player ${index + 1}`}
            user={player}
            onUserChange={updateUser(index)}
            userList={users}
            required
          />
        ))}
        {errors && <div className="text-xs text-red-500">{errors}</div>}
        <div className="flex flex-row gap-1">
          <Button color="red" fill="filled" onClick={onClose}>
            Cancel
          </Button>
          <Button color="blue" fill="outlined" onClick={onRefresh}>
            Refresh Players
          </Button>
          <Button color="green" fill="outlined" onClick={handleSubmit}>
            Next
          </Button>
        </div>
      </Fieldset>
    </div>
  );
};

const chomboFormSchema = z.object({
  description: z.string(),
});

type ChomboEntryFormProps = {
  hidden?: boolean;
  players: RankedMatch['players'];
  chombos: [number, string][];
  onChange: (newList: [number, string][]) => void;
  onBack: () => void;
  onSubmit: () => void;
};

const ChomboEntryForm = ({
  players,
  chombos,
  onChange,
  onBack,
  onSubmit,
  hidden,
}: ChomboEntryFormProps) => {
  const { register, formState, getValues } = useForm({
    mode: 'onBlur',
    resolver: zodResolver(chomboFormSchema),
    defaultValues: { description: '' },
  });

  const [selectedPlayer, setSelectedPlayer] = useState(0);

  const handleRecordChombo = () => {
    const description = getValues('description');
    onChange([...chombos, [selectedPlayer, description]]);
  };

  return (
    <div className={hidden ? 'hidden' : ''}>
      <div className="text-sm font-bold">Chombos</div>
      {chombos.length === 0 ? (
        <div className="text-sm">No chombos this match. Yay!</div>
      ) : (
        <div className="flex flex-col gap-1 max-h-48 overflow-auto">
          {chombos.map(([player, desc], index) => {
            const handleDelete = () => {
              onChange(chombos.filter((_, i) => i !== index));
            };
            return (
              <div key={index} className="border rounded-lg p-2">
                <div className="flex flex-row justify-between content-center">
                  <div className="text-sm font-bold align-middle">
                    <MatchPlayerName {...players[player]} />
                  </div>
                  <Button
                    color="red"
                    fill="outlined"
                    icon
                    onClick={handleDelete}
                  >
                    <TrashIcon className="h-4 w-4" />
                    <div className="sr-only">Delete</div>
                  </Button>
                </div>
                {desc && <Text className="text-sm">{desc}</Text>}
              </div>
            );
          })}
        </div>
      )}
      <hr className="h-px my-3 bg-gray-200 border-0" />
      <div className="text-sm font-bold">Record New Chombo</div>
      <Fieldset className="flex flex-col gap-2 mt-1">
        <SelectField
          label="Player"
          displayOption={(i) => renderPlayerName(players[i])}
          options={players.map((_, i) => i)}
          value={selectedPlayer}
          onChange={setSelectedPlayer}
        />
        <TextareaField
          label="Description of Chombo"
          name="description"
          register={register}
          errors={formState.errors}
        />
        <div>
          <Button color="blue" fill="outlined" onClick={handleRecordChombo}>
            Record Chombo
          </Button>
        </div>
      </Fieldset>
      <hr className="h-px my-3 bg-gray-200 border-0" />
      <div className="flex flex-row gap-4">
        <Button color="red" fill="outlined" onClick={onBack}>
          Back
        </Button>
        <Button color="green" fill="filled" onClick={onSubmit}>
          Submit
        </Button>
      </div>
    </div>
  );
};

const scoreEntrySchema = z.object({
  players: z.array(z.number().multipleOf(100)),
  leftoverBets: z.number().multipleOf(1000).min(0),
});

export type ScoreEntryFormProps = {
  leagueId: number;
  targetMatch: RankedMatch;
  onClose: () => void;
};

const ScoreEntryForm = ({
  leagueId,
  targetMatch,
  onClose,
}: ScoreEntryFormProps) => {
  const numPlayers = targetMatch.players.length;
  const { startPts } = targetMatch.ruleset;
  const expectedTotal = numPlayers * startPts;
  const [chomboEntryStage, setChomboEntryStage] = useState(false);
  const [chombos, setChombos] = useState<[number, string][]>([]);

  const { register, formState, watch, handleSubmit, getValues } = useForm({
    mode: 'onChange',
    resolver: zodResolver(scoreEntrySchema),
    defaultValues: {
      players: targetMatch.players.map(() => startPts),
      leftoverBets: 0,
    },
  });

  const utils = trpc.useUtils();
  const players = watch('players');
  const leftoverBets = watch('leftoverBets');
  const sum = sumTableScores(players, leftoverBets);
  const sumCorrect = sum === expectedTotal;
  const handleContinue = handleSubmit(() => {
    if (sumCorrect) setChomboEntryStage(true);
  });

  const record = trpc.matches.record.useMutation({
    async onSuccess() {
      onClose();
      await utils.matches.getIncompleteByEvent.invalidate();
      return utils.matches.getCompletedByLeague.invalidate(leagueId);
    },
    onError(e) {
      console.error(e);
    },
  });

  const handleComplete = () => {
    record.mutate({
      matchId: targetMatch.id,
      leftoverBets: getValues('leftoverBets'),
      players: getValues('players').map((score, index) => ({
        score,
        chombos: chombos.flatMap(([player, desc]) =>
          player === index ? [desc] : [],
        ),
      })),
    });
  };

  return (
    <>
      <Fieldset
        className={clsx(
          'flex flex-col space-y-4',
          chomboEntryStage && 'hidden',
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
      <ChomboEntryForm
        players={targetMatch.players}
        chombos={chombos}
        onChange={setChombos}
        hidden={!chomboEntryStage}
        onBack={() => setChomboEntryStage(false)}
        onSubmit={handleComplete}
      />
    </>
  );
};

export type MatchEntryDialogProps = {
  targetEvent: RankedEvent | null;
  setTargetEvent: (e: RankedEvent | null) => void;
  targetMatch: RankedMatch | null;
  setTargetMatch: (e: RankedMatch | null) => void;
};

export default function MatchEntryDialog({
  targetEvent,
  setTargetEvent,
  targetMatch,
  setTargetMatch,
}: MatchEntryDialogProps) {
  const users = trpc.user.listAll.useQuery();
  const utils = trpc.useUtils();
  const handleClose = () => {
    setTargetEvent(null);
    setTargetMatch(null);
  };

  const handleSuccess = ({ match }: MatchCreationResult) => {
    setTargetMatch(match);
    if (targetEvent) {
      utils.matches.getIncompleteByEvent.invalidate(targetEvent.id);
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
          <MatchCreationForm
            hidden={targetMatch !== null}
            eventId={targetEvent.id}
            gameMode={targetEvent.ruleset.gameMode}
            onRefresh={() => utils.user.listAll.invalidate()}
            onClose={handleClose}
            users={users.data?.users ?? null}
            onSuccess={handleSuccess}
          />
          {targetMatch && (
            <ScoreEntryForm
              targetMatch={targetMatch}
              onClose={handleClose}
              leagueId={targetEvent.parentId}
            />
          )}
        </>
      )}
    </Dialog>
  );
}
