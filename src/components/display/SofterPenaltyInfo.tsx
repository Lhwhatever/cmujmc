import React, { useState } from 'react';
import { RouterOutputs, trpc } from '../../utils/trpc';
import { TransactionType } from '@prisma/client';
import Button from '../Button';
import Dialog from '../Dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import InputField from '../form/InputField';

type Txns = RouterOutputs['leagues']['scoreHistory']['txns'];

const computeMatchStats = (txns: Txns) => {
  let numMatches = 0;
  let numChombos = 0;
  for (const { type } of txns) {
    switch (type) {
      case TransactionType.MATCH_RESULT:
        ++numMatches;
        break;
      case TransactionType.CHOMBO:
        ++numChombos;
        break;
    }
  }
  return { numMatches, numChombos };
};

type SofterPenaltyApplicationDialogProps = {
  leagueId: number;
};

const confirmationFormSchema = z.object({
  confirmation: z.string(),
});

const SofterPenaltyApplicationDialog = ({
  leagueId,
}: SofterPenaltyApplicationDialogProps) => {
  const confirmationString = 'confirm';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const { register, formState, watch } = useForm({
    resolver: zodResolver(confirmationFormSchema),
  });

  const disabled = watch('confirmation') !== confirmationString;
  const utils = trpc.useUtils();
  const apply = trpc.leagues.softerPenalty.useMutation({
    onSuccess() {
      setDialogOpen(false);
      return Promise.all([
        utils.leagues.get.invalidate(leagueId),
        utils.leagues.scoreHistory.invalidate(leagueId),
      ]);
    },
    onError(e) {
      setError(e.message);
    },
  });

  const handleApply = () => {
    if (!disabled) apply.mutate({ leagueId });
  };

  return (
    <>
      <Button color="red" fill="filled" onClick={() => setDialogOpen(true)}>
        Apply for Softer Penalties
      </Button>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Apply for Softer Penalties"
      >
        <p>
          Opting in for softer penalties is{' '}
          <span className="font-bold">irreversible</span>.
        </p>
        <p>
          To confirm, type{' '}
          <span className="font-bold">{confirmationString}</span> below:
        </p>
        <InputField
          name="confirmation"
          register={register}
          errors={formState.errors}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex flex-row justify-between">
          <Button
            color="yellow"
            fill="filled"
            onClick={() => setDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            color="red"
            fill="filled"
            onClick={handleApply}
            disabled={disabled}
          >
            Apply
          </Button>
        </div>
      </Dialog>
    </>
  );
};

export type SofterPenaltyProps = {
  matchesRequired: number;
  freeChombos: number | null;
  leagueId: number;
};

export default function SofterPenaltyInfo({
  leagueId,
  matchesRequired,
  freeChombos,
}: SofterPenaltyProps) {
  const query = trpc.leagues.scoreHistory.useQuery(leagueId);
  if (!query.data) return <></>;

  const { numMatches, numChombos } = computeMatchStats(query.data.txns);

  return (
    <div className="border bg-yellow-100 rounded-lg outline-yellow-800 p-2 m-2">
      <p>
        You have played <span className="font-bold">{numMatches}</span>{' '}
        match(es) and committed <span className="font-bold">{numChombos}</span>{' '}
        chombo(s).
      </p>
      {freeChombos === null && numMatches < 3 && (
        <>
          <p>
            Before completing {matchesRequired} match(es), you can opt in to
            Softer Penalty. That would make your first 3 chombos incur no
            penalty, but you will be ineligible from the top prize of the
            league.
          </p>
          <SofterPenaltyApplicationDialog leagueId={leagueId} />
        </>
      )}
      {freeChombos !== null && (
        <div>
          You are under the softer penalty system. Your next{' '}
          <span className="font-bold">{freeChombos}</span> chombo(s) incur no
          penalty.
        </div>
      )}
    </div>
  );
}