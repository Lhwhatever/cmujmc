import Page from '../../components/Page';
import { useSession } from 'next-auth/react';
import Heading from '../../components/Heading';
import ButtonLink from '../../components/ButtonLink';
import { trpc } from '../../utils/trpc';
import Loading from '../../components/Loading';
import Button from '../../components/Button';

const WwydTemplateManagement = () => {
  return (
    <div className="bg-yellow-200 border-yellow-800 p-4 rounded-lg mb-4">
      <Heading level="h4">Admin Panel</Heading>
      <ButtonLink color="blue" fill="filled" href="/wwyd/template">
        Manage WWYD Templates
      </ButtonLink>
    </div>
  );
};

interface WwydListProps {
  wwyds: [number, string][];
}

const WwydList = ({ wwyds }: WwydListProps) => {
  const utils = trpc.useUtils();
  const session = useSession();

  const deleteMutation = trpc.wwyd.quiz.delete.useMutation({
    async onSuccess() {
      utils.wwyd.quiz.list.invalidate();
    },
    async onError(error) {
      alert(error.message);
    },
  });

  if (wwyds.length === 0) {
    return 'No WWYD quizzes available now...';
  }

  return (
    <>
      {wwyds
        .sort(([id1, _1], [id2, _2]) => id1 - id2)
        .map(([id, name]) => (
          <div
            key={id}
            className="border border-gray-400 p-4 w-full rounded-xl"
          >
            <Heading level="h5">{name}</Heading>
            <div className="flex flex-row mt-2 gap-2">
              <ButtonLink color="blue" fill="filled" href={`wwyd/${id}`}>
                Play
              </ButtonLink>
              {session.data?.user?.role === 'admin' && (
                <>
                  <ButtonLink
                    color="yellow"
                    fill="filled"
                    href={`wwyd/${id}/admin`}
                  >
                    Manage
                  </ButtonLink>
                  <Button
                    color="red"
                    fill="filled"
                    onClick={() => deleteMutation.mutate(id)}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
    </>
  );
};

export default function WwydListPage() {
  const session = useSession();
  const wwyds = trpc.wwyd.quiz.list.useQuery(undefined, {
    refetchInterval: 10000,
  });

  return (
    <Page>
      {session.data?.user?.role === 'admin' && <WwydTemplateManagement />}
      <Heading level="h3">Live WWYD Quizzes</Heading>
      {wwyds.data !== undefined ? (
        <div className="flex flex-row w-full gap-y-2 py-2">
          <WwydList wwyds={wwyds.data} />
        </div>
      ) : (
        <div className="mt-4">
          <Loading />
        </div>
      )}
    </Page>
  );
}
