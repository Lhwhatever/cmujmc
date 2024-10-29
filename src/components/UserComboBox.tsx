import React, { useState } from 'react';
import ComboboxField from './form/ComboboxField';
import { RouterOutputs } from '../utils/trpc';
import Fuse from 'fuse.js';
import { renderAliases } from '../utils/usernames';

export type User = RouterOutputs['user']['listAll']['users'][number];

export type UserOption =
  | { type: 'registered'; payload: User }
  | { type: 'unregistered'; payload: string };

export type UserComboBoxProps = {
  label?: string;
  userList: User[] | null;
  user: UserOption | null;
  onUserChange: (user: UserOption | null) => void;
  required?: boolean;
};

const displayUser = (user: UserOption | null): string => {
  if (user === null) return '';
  if (user.type === 'unregistered') return `Guest '${user.payload}'`;
  return renderAliases(user.payload.name, user.payload);
};

const getResults = (
  data: User[],
  fuse: Fuse<User>,
  query: string,
): UserOption[] => {
  if (query.length === 0) {
    return data.map(
      (payload) => ({ type: 'registered', payload } as UserOption),
    );
  }

  const sorted = fuse.search(query);
  let i = 0;
  while (i < sorted.length && sorted[i].score === 0) ++i;
  const results = sorted
    .slice(0, i)
    .map(({ item }) => ({ type: 'registered', payload: item } as UserOption));
  results.push({ type: 'unregistered', payload: query });
  return results.concat(
    sorted.slice(i).map(({ item }) => ({ type: 'registered', payload: item })),
  );
};

export default function UserComboBox({
  label,
  user,
  userList,
  onUserChange,
  required,
}: UserComboBoxProps) {
  const [query, setQuery] = useState('');

  const fuse =
    userList &&
    new Fuse(userList, {
      includeScore: true,
      keys: ['displayName', 'name', 'andrew', 'discord'],
    });

  const results = fuse && userList ? getResults(userList, fuse, query) : null;

  return (
    <ComboboxField
      label={label}
      onChange={onUserChange}
      options={results}
      displayValue={displayUser}
      value={user}
      query={query}
      onQueryChange={setQuery}
      required={required}
    />
  );
}
