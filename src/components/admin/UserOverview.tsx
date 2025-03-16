import { trpc } from '../../utils/trpc';
import Table, { TableCell, TableHeading, TableRow } from '../Table';
import Loading from '../Loading';
import { renderAliases } from '../../utils/usernames';
import { Suspense, useEffect } from 'react';

const UserTable = () => {
  const [{ pages }, { isFetching, hasNextPage, fetchNextPage }] =
    trpc.user.listAll.useSuspenseInfiniteQuery(
      {},
      {
        getNextPageParam(s) {
          return s.nextCursor;
        },
      },
    );

  useEffect(() => {
    if (!isFetching && hasNextPage) {
      void fetchNextPage();
    }
  }, [isFetching, hasNextPage, fetchNextPage]);

  const users = pages.flatMap((page) => page.users);

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
  return (
    <Suspense fallback={<Loading />}>
      <UserTable />
    </Suspense>
  );
}
