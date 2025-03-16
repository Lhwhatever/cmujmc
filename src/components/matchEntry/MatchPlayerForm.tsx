import { Suspense, useEffect, useState } from 'react';
import { getNumPlayers } from '../../utils/gameModes';
import UserComboBox, { UserOption, userOptionToParam } from '../UserComboBox';
import { RouterOutputs, trpc } from '../../utils/trpc';
import { Fieldset } from '@headlessui/react';
import Button from '../Button';
import { z } from 'zod';
import Loading from 'components/Loading';
import { indexByKey } from 'utils/indexBy';
import InputField from '../form/InputField';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { arePlayersDistinct } from '../../protocol/match';
import { MatchPlayerFormData, MatchPlayerFormOperation } from './types';

export type MatchPlayerFormOnNext = (
  data: MatchPlayerFormData,
  onSuccess: () => void,
  onErrors: (messages: string[]) => void,
) => void;

interface InputsProps {
  operation: MatchPlayerFormOperation;
  onPrev: () => void;
  onNext: MatchPlayerFormOnNext;
  onRefresh: () => void;
  users: Users;
  isLoading: boolean;
}

type Users = RouterOutputs['user']['listAll']['users'];

const formSchema = z.object({
  time: z.date().optional(),
});

const allNonNull = <T,>(elems: (T | null)[]): elems is T[] =>
  elems.every((elem) => elem !== null);

const Inputs = ({
  operation,
  onPrev,
  onRefresh,
  onNext,
  users,
  isLoading,
}: InputsProps) => {
  const session = useSession();
  const usersById = indexByKey(users, 'id');
  const [players, setPlayers] = useState<(UserOption | null)[]>(() => {
    switch (operation.type) {
      case 'create': {
        const numPlayers = getNumPlayers(operation.event.ruleset.gameMode);
        return new Array(numPlayers).fill(null);
      }
      case 'update':
        return operation.match.players.map(
          ({ player, unregisteredPlaceholder }): UserOption | null => {
            if (player !== null) {
              const payload = usersById.get(player.id);
              if (payload === undefined) return null;
              return { type: 'registered', payload };
            }

            if (unregisteredPlaceholder !== null) {
              return { type: 'unregistered', payload: unregisteredPlaceholder };
            }

            return null;
          },
        );
    }
  });

  const updateUser = (i: number) => (player: UserOption | null) => {
    setPlayers(players.map((p, j) => (i === j ? player : p)));
  };
  const [selfErrors, setSelfErrors] = useState<string[]>([]);

  const { register, formState, handleSubmit } = useForm({
    mode: 'onBlur',
    resolver: zodResolver(formSchema),
    defaultValues: async () => {
      switch (operation.type) {
        case 'create':
          return { time: undefined };
        case 'update':
          return { time: operation.match.time };
      }
    },
  });

  const isAdmin = session.data?.user?.role === 'admin';

  const passToNext = (timeInput: Date | undefined) => {
    const time = isAdmin ? timeInput : undefined;

    if (!allNonNull(players)) {
      setSelfErrors(['Every player must be specified!']);
      return;
    }

    const options = players.map(userOptionToParam);
    if (!arePlayersDistinct(options)) {
      setSelfErrors(['Players must be distinct!']);
      return;
    }

    onNext({ time, players }, () => setSelfErrors([]), setSelfErrors);
  };

  const handleNext = handleSubmit(
    ({ time }) => passToNext(time),
    () => passToNext(undefined),
  );

  return (
    <Fieldset className="space-y-6">
      {isAdmin && (
        <InputField
          name="time"
          label="Time"
          register={register}
          errors={formState.errors}
          type="datetime-local"
        />
      )}
      {players.map((player, index) => (
        <UserComboBox
          key={index}
          label={`Player ${index + 1}`}
          user={player}
          onUserChange={updateUser(index)}
          userList={users}
          isLoading={isLoading}
          required
        />
      ))}
      {selfErrors.map((error, index) => (
        <div key={index} className="text-xs text-red-500">
          {error}
        </div>
      ))}
      <div className="flex flex-row gap-1 pt-2">
        <Button color="red" fill="filled" onClick={onPrev}>
          Cancel
        </Button>
        <Button color="blue" fill="outlined" onClick={onRefresh}>
          Refresh Players
        </Button>
        <Button color="green" fill="outlined" onClick={handleNext}>
          Next
        </Button>
      </div>
    </Fieldset>
  );
};

type MatchPlayerFormWithQueryProps = Pick<
  InputsProps,
  'operation' | 'onPrev' | 'onNext'
>;

const MatchPlayerFormWithQuery = (props: MatchPlayerFormWithQueryProps) => {
  const [{ pages }, userListQuery] = trpc.user.listAll.useSuspenseInfiniteQuery(
    {},
    {
      getNextPageParam(s) {
        return s.nextCursor;
      },
    },
  );

  const [isReady, setIsReady] = useState(false);

  const users = pages?.flatMap((r) => r.users);

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

  useEffect(() => {
    if (!userListQuery.hasNextPage) {
      setIsReady(true);
    }
  }, [setIsReady, userListQuery.hasNextPage]);

  const utils = trpc.useUtils();

  const onRefresh = () => {
    void utils.user.listAll.refetch();
  };

  if (!isReady) return <Loading />;

  return (
    <Inputs
      users={users}
      onRefresh={onRefresh}
      isLoading={userListQuery.isFetching}
      {...props}
    />
  );
};

export type MatchPlayerFormProps = MatchPlayerFormWithQueryProps & {
  hidden: boolean;
};

const MatchPlayerForm = ({ hidden, ...other }: MatchPlayerFormProps) => {
  return (
    <div className={hidden ? 'hidden' : ''}>
      <Suspense fallback={<Loading />}>
        <MatchPlayerFormWithQuery {...other} />
      </Suspense>
    </div>
  );
};

export default MatchPlayerForm;
