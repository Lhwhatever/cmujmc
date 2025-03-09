import { useEffect, useState } from 'react';
import Page from '../../../components/Page';
import Scenario2D from '../../../components/hand/Scenario2D';
import clsx from 'clsx';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { trpc } from '../../../utils/trpc';
import { useRouter } from 'next/router';
import ButtonLink from '../../../components/ButtonLink';
import schema from '../../../protocol/schema';
import { z } from 'zod';
import { wwydQuestionSchema } from '../../../utils/wwyd/basicSchema';

interface NotReadyScreenProps {
  quizId: number;
  isDone: boolean;
}

const FalloverScreen = ({ quizId, isDone }: NotReadyScreenProps) => {
  const query = trpc.wwyd.quiz.countParticipants.useQuery(quizId, {
    refetchInterval: 10000,
  });

  return (
    <div className="bg-black text-white h-full m-auto p-4 flex flex-col justify-center gap-4">
      <div className="text-center">
        {isDone
          ? 'The quiz is over. Thanks for playing!'
          : 'The quiz is not ready yet. Please wait for the host.'}
      </div>
      <div className="text-center">
        {!isDone &&
          (query.data === undefined
            ? 'Connecting...'
            : `${query.data} player(s) connected.`)}
      </div>
      <div className="w-fit mx-auto">
        <ButtonLink fill="filled" color="red" href="/wwyd">
          Back
        </ButtonLink>
      </div>
    </div>
  );
};

interface WwydScenarioWrapperProps {
  quizId: number;
}

type Question = z.infer<typeof wwydQuestionSchema>;

export const WwydScenarioWrapper = ({ quizId }: WwydScenarioWrapperProps) => {
  const [questionId, setQuestionId] = useState<number | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [isDone, setIsDone] = useState(false);

  trpc.wwyd.quiz.play.useSubscription(quizId, {
    onData(event) {
      const e = event as unknown as z.infer<typeof schema.wwyd.quiz.playOutput>;
      switch (e.type) {
        case 'question':
          setQuestionId(e.id);
          setQuestion(e.data);
          break;
        case 'done':
          setIsDone(true);
          break;
      }
    },
  });

  const submitMutation = trpc.wwyd.quiz.submit.useMutation();

  if (question === null || questionId === null || isDone)
    return <FalloverScreen quizId={quizId} isDone={isDone} />;

  const settings = {
    endDate: new Date(question.settings.endDate),
  };

  if (question.schema === '2d') {
    return (
      <Scenario2D
        questionId={questionId}
        scenario={question.scenario}
        settings={settings}
        onSubmit={(answer) =>
          submitMutation.mutateAsync({ quizId, questionId, answer })
        }
      />
    );
  }

  return <div>Unsupported/unknown schema {question.schema}</div>;
};

export default function WwydPage() {
  const [bannerHidden, setBannerHidden] = useState(false);
  const router = useRouter();

  const quizId = parseInt(router.query.session as string);

  useEffect(() => {
    if (Number.isNaN(quizId)) void router.push('/wwyd');
  }, [router, quizId]);

  return (
    <Page className="mt-8 h-[calc(100dvh-2rem)] sm:mt-12 sm:h-[calc(100dvh-3rem)] lg:mt-16 lg:h-[calc(100dvh-4rem)] box-border">
      <div
        className={clsx(
          'absolute bg-yellow-400 p-4 top-16 w-dvw sm:invisible flex flex-row z-50',
          bannerHidden && 'invisible',
        )}
      >
        <div className="p-1">
          Your screen may be too narrow to render the following content as
          intended. Try changing your device orientation to landscape or using
          another device.
        </div>
        <button className="p-1" onClick={() => setBannerHidden(true)}>
          <XMarkIcon height={36} />
        </button>
      </div>
      <WwydScenarioWrapper quizId={quizId} />
    </Page>
  );
}

WwydPage.auth = {
  role: 'user',
};
