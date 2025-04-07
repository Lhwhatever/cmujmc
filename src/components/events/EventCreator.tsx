import { z } from 'zod';
import schema from '../../protocol/schema';
import { trpc } from '../../utils/trpc';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminUserError } from '../../protocol/errors';
import Button from '../Button';
import Dialog from '../Dialog';
import { Fieldset } from '@headlessui/react';
import InputField from '../form/InputField';

interface EventCreatorProps {
  leagueId: number;
}

const eventCreationSchema = schema.event.create.omit({ leagueId: true });
type EventCreationParams = z.infer<typeof eventCreationSchema>;
const eventCreationDefaultValues: EventCreationParams = {
  startDate: undefined,
  endDate: undefined,
  submissionBufferMinutes: 30,
};

export default function EventCreator({ leagueId }: EventCreatorProps) {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { register, formState, setError, clearErrors, handleSubmit } = useForm({
    mode: 'onChange',
    resolver: zodResolver(eventCreationSchema),
    defaultValues: eventCreationDefaultValues,
  });

  const createEventMutation = trpc.events.create.useMutation({
    async onSuccess() {
      clearErrors();
      setDialogOpen(false);
      await utils.events.getByLeague.invalidate({ leagueId });
    },
    onError(e) {
      const parsed = AdminUserError.parse<EventCreationParams>(e.message);
      if (parsed) {
        setError(
          parsed.field,
          {
            type: 'value',
            message: parsed.message,
          },
          { shouldFocus: true },
        );
      }
    },
  });

  const onSubmit = (values: EventCreationParams) =>
    createEventMutation.mutateAsync({ ...values, leagueId });

  return (
    <>
      <Button color="green" fill="filled" onClick={() => setDialogOpen(true)}>
        Create
      </Button>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create Event"
      >
        <Fieldset className="space-y-6">
          <InputField
            name="startDate"
            label="Starts..."
            type="datetime-local"
            register={register}
            errors={formState.errors}
          />
          <InputField
            name="endDate"
            label="Ends..."
            type="datetime-local"
            register={register}
            errors={formState.errors}
          />
          <InputField
            name="submissionBufferMinutes"
            label="Number of minutes to submit results"
            type="number"
            step={5}
            min={0}
            register={register}
            errors={formState.errors}
          />
          <div className="flex flex-row">
            <Button
              color="green"
              fill="filled"
              onClick={() => {
                void handleSubmit(onSubmit)();
              }}
            >
              Submit
            </Button>
            <Button
              color="red"
              fill="filled"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </Fieldset>
      </Dialog>
    </>
  );
}
