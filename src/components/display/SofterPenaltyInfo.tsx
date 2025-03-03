import { useState } from 'react';
import { trpc } from '../../utils/trpc';
import Button from '../Button';
import Dialog from '../Dialog';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import InputField from '../form/InputField';

interface SofterPenaltyApplicationDialogProps {
  leagueId: number;
}

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

export interface SofterPenaltyProps {
  softPenaltyCutoff: number;
  freeChombos: number | null;
  leagueId: number;
  numMatches: number;
}

export default function SofterPenaltyInfo({
  leagueId,
  softPenaltyCutoff,
  freeChombos,
  numMatches,
}: SofterPenaltyProps) {
  return (
    <>
      {freeChombos === null && numMatches < softPenaltyCutoff && (
        <div className="border bg-yellow-100 rounded-lg outline-yellow-800 p-2 m-2">
          <p>
            Before completing {softPenaltyCutoff} match(es), you can opt in to
            Softer Penalty. That would make your first 3 chombos incur no
            penalty, but you will be ineligible from the top prize of the
            league.
          </p>
          <SofterPenaltyApplicationDialog leagueId={leagueId} />
        </div>
      )}
      {freeChombos !== null && (
        <div className="border bg-yellow-100 rounded-lg outline-yellow-800 p-2 m-2">
          You are under the softer penalty system. Your next{' '}
          <span className="font-bold">{freeChombos}</span> chombo(s) incur no
          penalty.
        </div>
      )}
    </>
  );
}
