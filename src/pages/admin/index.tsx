import React from 'react';
import { Page } from '../../components/Page';
import { RouterOutputs, trpc } from '../../utils/trpc';
import { useSession } from 'next-auth/react';
import Table from '../../components/Table';

type UserTableProps = {
  users: RouterOutputs['user']['listAll']['users'],
};

const UserTable = ({ users }: UserTableProps) => {
  return (
    <Table head={
      <Table.Row>
        <Table.Heading scope="col">Name</Table.Heading>
        <Table.Heading scope="row">Role</Table.Heading>
      </Table.Row>
    }>
      {users.map((user) => (
        <Table.Row key={user.id}>
          <Table.Heading scope="row">{user.displayName}</Table.Heading>
          <Table.Cell>{user.admin ? 'Admin' : 'User'}</Table.Cell>
        </Table.Row>
      ))}
    </Table>
  )
}

const UserDashboard = () => {
  const users = trpc.user.listAll.useQuery();

  return (
    <div>
      <h3 className="text-2xl">Users</h3>
      {users.data
        ? <UserTable users={users.data.users} />
        : <div>Loading...</div>
      }
    </div>
  );
};

export default function AdminPage() {
  const { status, data: session } = useSession({ required: true });
  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (session?.user.role !== 'admin') {
    return <div>Unauthorized</div>;
  }

  return (
    <Page>
      <UserDashboard />
    </Page>
  )
}

AdminPage.auth = {
  role: 'admin',
  loading: <div>Loading...</div>,
  unauthorized: '/',
}