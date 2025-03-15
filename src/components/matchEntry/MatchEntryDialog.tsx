import { useEffect, useState } from 'react';
import Dialog from '../Dialog';
import { Fieldset } from '@headlessui/react';
import UserComboBox, { UserOption } from '../UserComboBox';
import Button from '../Button';
import { RouterOutputs, trpc } from '../../utils/trpc';
import { GameMode } from '@prisma/client';
import { getNumPlayers } from '../../utils/gameModes';
import { RankedEvent } from '../display/RankedEventDetails';
import { ScoreEntryForm } from './ScoreEntryForm';

type MatchCreationResult = RouterOutputs['matches']['create'];
export type RankedMatch = NonNullable<
  RouterOutputs['matches']['getById']['match']
>;

interface MatchCreationFormProps {
  eventId: number;
  gameMode: GameMode;
  onRefresh: () => void;
  onClose: () => void;
  onSuccess: (_m: MatchCreationResult) => void;
  hidden?: boolean;
}

const MatchCreationForm = ({
  gameMode,
  onClose,
  onRefresh,
  onSuccess: onMatchCreationSuccess,
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

  const createMatchMutation = trpc.matches.create.useMutation({
    onSuccess(result) {
      onMatchCreationSuccess(result);
    },
    onError(e) {
      setErrors(e.message);
    },
  });

  const userListQuery = trpc.user.listAll.useInfiniteQuery(
    {},
    {
      getNextPageParam(s) {
        return s.nextCursor;
      },
    },
  );

  useEffect(() => {
    if (!userListQuery.isFetching && userListQuery.hasNextPage) {
      void userListQuery.fetchNextPage();
    }
  }, [
    userListQuery,
    userListQuery.isFetching,
    userListQuery.hasNextPage,
    userListQuery.fetchNextPage,
  ]);

  const users = userListQuery.data?.pages?.flatMap((r) => r.users);

  const handleSubmit = () => {
    if (players.every((p) => p !== null)) {
      createMatchMutation.mutate({
        eventId,
        players: players.map(({ type, payload }) => ({
          type,
          payload: type === 'registered' ? payload.id : payload,
        })),
      });
    } else {
      setErrors('Every player must be specified!');
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
            isLoading={userListQuery.isFetching}
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

export interface MatchEntryDialogProps {
  targetEvent: RankedEvent | null;
  setTargetEvent: (_: RankedEvent | null) => void;
  targetMatch: RankedMatch | null;
  setTargetMatch: (_: RankedMatch | null) => void;
}

export default function MatchEntryDialog({
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

  const handleRefresh = () => void utils.user.listAll.invalidate();

  const handleSuccess = ({ match }: MatchCreationResult) => {
    setTargetMatch(match);
    if (targetEvent) {
      void (async () =>
        await utils.matches.getIncompleteByEvent.invalidate(targetEvent.id))();
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
            onRefresh={handleRefresh}
            onClose={handleClose}
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
