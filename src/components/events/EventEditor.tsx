import schema from '../../protocol/schema';
import Dialog from '../Dialog';
import { Fieldset } from '@headlessui/react';
import InputField from '../form/InputField';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RankedEvent } from '../display/RankedEventDetails';
import Button from '../Button';
import { trpc } from '../../utils/trpc';

interface EventEditorContentProps {
  event: RankedEvent;
  onSuccess: (() => void) | (() => Promise<void>);
  onClose: () => void;
}

const eventEditSchema = schema.event.edit.omit({ eventId: true });

const EventEditorContents = ({
  event,
  onClose,
  onSuccess,
}: EventEditorContentProps) => {
  const { register, formState, handleSubmit } = useForm({
    mode: 'onChange',
    resolver: zodResolver(eventEditSchema),
    defaultValues: {
      startDate: event.startDate,
      endDate: event.endDate,
      closingDate: event.closingDate,
    },
  });

  const editMutation = trpc.events.edit.useMutation();

  const handleEditSubmit = handleSubmit(
    (values) => {
      editMutation.mutate({ ...values, eventId: event.id }, { onSuccess });
    },
    (errors) => alert(JSON.stringify(errors)),
  );

  return (
    <Fieldset className="flex flex-col space-y-6">
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
        name="closingDate"
        label="Submissions close..."
        type="datetime-local"
        register={register}
        errors={formState.errors}
      />
      <div className="flex flex-row gap-x-4">
        <Button fill="outlined" color="red" onClick={onClose}>
          Cancel
        </Button>
        <Button fill="filled" color="green" onClick={handleEditSubmit}>
          Submit
        </Button>
      </div>
    </Fieldset>
  );
};

export type EventEditorProps = Omit<EventEditorContentProps, 'event'> & {
  event: EventEditorContentProps['event'] | null;
};

export default function EventEditor({
  event,
  onClose,
  onSuccess,
}: EventEditorProps) {
  return (
    <Dialog open={event !== null} onClose={onClose} title="Edit Event">
      {event !== null && (
        <EventEditorContents
          event={event}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}
