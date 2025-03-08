import { useRouter } from 'next/router';
import Page from '../../../components/Page';
import { trpc } from '../../../utils/trpc';
import { useEffect, useState } from 'react';
import Loading from '../../../components/Loading';
import Button from '../../../components/Button';
import clsx from 'clsx';
import { WwydScenarioWrapper } from './index';

interface WwydAdminProps {
  quizId: number;
}

const WwydAdmin = ({ quizId }: WwydAdminProps) => {
  const [done, _setDone] = useState(false);

  const nextQuestionMutation = trpc.wwyd.quiz.admin.nextQuestion.useMutation();
  const restartMutation = trpc.wwyd.quiz.admin.restart.useMutation();

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-row gap-2">
        <Button
          color="blue"
          fill="outlined"
          className={clsx(done && 'hidden')}
          onClick={() => nextQuestionMutation.mutate(quizId)}
        >
          Next Question
        </Button>
        <Button
          color="red"
          fill="outlined"
          className={clsx(done && 'hidden')}
          onClick={() => restartMutation.mutate(quizId)}
        >
          Restart
        </Button>
      </div>
      <div className="w-full max-w-[80vw]">
        <WwydScenarioWrapper quizId={quizId} />
      </div>
    </div>
  );
};

export default function WwydAdminPage() {
  const router = useRouter();
  const quizId = parseInt(router.query.session as string);

  useEffect(() => {
    if (Number.isNaN(quizId)) void router.back();
  }, [router, quizId]);

  return (
    <Page>
      {Number.isNaN(quizId) ? <Loading /> : <WwydAdmin quizId={quizId} />}
    </Page>
  );
}

WwydAdminPage.auth = {
  role: 'admin',
  unauthorizedRedirect: '/wwyd',
};
