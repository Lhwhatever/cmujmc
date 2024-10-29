import React from 'react';
import { RouterOutputs, trpc } from '../../utils/trpc';
import Table, { TableCell, TableHeading, TableRow } from '../Table';
import Loading from '../Loading';
import { renderAliases } from '../../utils/maskNames';

type UserTableProps = {
  users: RouterOutputs['user']['listAll']['users'];
};

const UserTable = ({ users }: UserTableProps) => {
  return (
    <Table
      head={
        <TableRow>
          <TableHeading scope="col">Name</TableHeading>
          <TableHeading scope="col">Role</TableHeading>
        </TableRow>
      }
    >
      {users.map((user) => (
        <TableRow key={user.id}>
          <TableHeading scope="row">
            {renderAliases(user.name, user)}
          </TableHeading>
          <TableCell>{user.admin ? 'Admin' : 'User'}</TableCell>
        </TableRow>
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
