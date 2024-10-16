import React from 'react';
import { RouterOutputs, trpc } from '../../utils/trpc';
import Table from '../Table';
import Loading from '../Loading';

type UserTableProps = {
  users: RouterOutputs['user']['listAll']['users'];
};

const UserTable = ({ users }: UserTableProps) => {
  return (
    <Table
      head={
        <Table.Row>
          <Table.Heading scope="col">Name</Table.Heading>
          <Table.Heading scope="col">Role</Table.Heading>
        </Table.Row>
      }
    >
      {users.map((user) => (
        <Table.Row key={user.id}>
          <Table.Heading scope="row">{user.displayName}</Table.Heading>
          <Table.Cell>{user.admin ? 'Admin' : 'User'}</Table.Cell>
        </Table.Row>
      ))}
    </Table>
  );
};

export default function UserOverview() {
  const users = trpc.user.listAll.useQuery();

  if (!users.data) {
    return <Loading />;
  }

  return <UserTable users={users.data.users} />;
}
