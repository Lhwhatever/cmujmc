import { prisma } from '../server/prisma';
import { Prisma } from '@prisma/client';

export type UserGroups = {
  cmu: boolean;
  discord: boolean;
};

export const getUserGroups = async (
  userId?: string | null,
): Promise<UserGroups> => {
  if (userId === undefined || userId === null)
    return { cmu: false, discord: false };
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { admin: true, andrew: true, discord: true },
  });
  return {
    cmu: user.andrew !== null || user.admin,
    discord: user.discord !== null || user.admin,
  };
};

export const userSelector = Prisma.validator<Prisma.UserDefaultArgs>()({
  select: {
    id: true,
    displayName: true,
    name: true,
    admin: true,
    andrew: true,
    discord: true,
  },
});

export type User = Prisma.UserGetPayload<typeof userSelector>;

export interface INames {
  id: string;
  name: string | null;
  displayName: string | null;
}

export type NameCoalesced<T extends INames> = Omit<
  T,
  'id' | 'name' | 'displayName'
> & {
  id: T['id'];
  name: string;
};

export const coalesceNames = <T extends INames>({
  id,
  displayName,
  name,
  ...rest
}: T): NameCoalesced<T> => ({
  id,
  name: displayName ?? name ?? `User ${id.slice(-6).toLowerCase()}`,
  ...rest,
});

export interface IMatchPlayer {
  player: User | null;
  unregisteredPlaceholder: string | null;
}

export type MatchPlayerNameCoalesced<T extends IMatchPlayer> = Omit<
  T,
  'player'
> & { player: NameCoalesced<NonNullable<T['player']>> | null };

export interface IAliases {
  andrew: string | null;
  discord: string | null;
}

export const maskNames = <T extends IAliases>(
  { andrew, discord, ...rest }: T,
  userGroups: UserGroups,
): T =>
  ({
    ...rest,
    andrew: userGroups.cmu ? andrew : null,
    discord: userGroups.discord ? discord : null,
  } as T);

export const renderAliases = (name: string, aliases: IAliases) => {
  const transformed = [aliases.andrew?.toLowerCase(), aliases.discord].filter(
    (value) => !!value,
  );
  if (transformed.length > 0) {
    return `${name} (${transformed.join(', ')})`;
  } else {
    return name;
  }
};

export const renderPlayerName = ({
  player,
  unregisteredPlaceholder,
}: MatchPlayerNameCoalesced<IMatchPlayer>) =>
  player?.name ?? `Guest '${unregisteredPlaceholder}'`;
