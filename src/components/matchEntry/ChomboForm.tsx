import clsx from 'clsx';
import { Suspense } from 'react';
import Loading from '../Loading';
import { ChomboFormData, RankedMatch } from './types';
import { trpc } from '../../utils/trpc';
import ChomboAffirmationForm from './ChomboAffirmationForm';
import ChomboEntryForm from './ChomboEntryForm';

export type ChomboFormOnNext = (data?: ChomboFormData) => void;

interface WithChomboQueryProps {
  targetMatch: RankedMatch;
  onPrev: () => void;
  onNext: ChomboFormOnNext;
}

const WithChomboQuery = ({
  targetMatch,
  onPrev,
  onNext,
}: WithChomboQueryProps) => {
  const [{ count, chombos }] = trpc.matches.getChombosOf.useSuspenseQuery(
    targetMatch.id,
  );

  return (
    <>
      {chombos === undefined ? (
        <ChomboAffirmationForm
          count={count}
          onPrev={onPrev}
          onNext={(commit) => {
            onNext(commit ? [] : undefined);
          }}
        />
      ) : (
        <ChomboEntryForm
          players={targetMatch.players}
          initialChombos={chombos}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </>
  );
};

export interface ChomboFormProps extends WithChomboQueryProps {
  hidden: boolean;
}

const ChomboForm = ({ hidden, ...other }: ChomboFormProps) => {
  return (
    <div className={clsx(hidden && 'hidden')}>
      <Suspense fallback={<Loading />}>
        <WithChomboQuery {...other} />
      </Suspense>
    </div>
  );
};

export default ChomboForm;
