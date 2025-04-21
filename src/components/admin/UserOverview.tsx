import { trpc } from '../../utils/trpc';
import Table, { TableCell, TableHeading, TableRow } from '../Table';
import Loading from '../Loading';
import { renderAliases } from '../../utils/usernames';
import { Suspense, useEffect } from 'react';
import Button from '../Button';

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

  const promoteAdminMutation = trpc.user.promoteAdmin.useMutation();
  const utils = trpc.useUtils();

  const users = pages.flatMap((page) => page.users);
  console.log(users);

  return (
    <Table
      head={
        <TableRow>
          <TableHeading scope="col">Name</TableHeading>
          <TableHeading scope="col">Role</TableHeading>
          <TableHeading scope="col"></TableHeading>
        </TableRow>
      }
    >
      {users.map((user) => (
        <TableRow key={user.id}>
          <TableHeading scope="row">
            {renderAliases(user.name, user)}
          </TableHeading>
          <TableCell>{user.admin ? 'Admin' : 'User'}</TableCell>
          <TableCell>
            {!user.admin && (
              <Button
                fill="filled"
                color="red"
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure you want to promote ${user.name} to admin?`,
                    )
                  ) {
                    promoteAdminMutation.mutate(user.id, {
                      async onSuccess() {
                        await utils.user.listAll.invalidate();
                      },
                    });
                  }
                }}
              >
                Promote
              </Button>
            )}
          </TableCell>
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
