import React, { useState } from 'react';
import Table from '../Table';
import { RouterOutputs, trpc } from '../../utils/trpc';
import Loading from '../Loading';
import Button from '../Button';
import { PlusIcon } from '@heroicons/react/16/solid';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Fieldset,
} from '@headlessui/react';
import { useForm } from 'react-hook-form';
import InputField from '../form/InputField';
import { z } from 'zod';
import CheckboxField from '../form/CheckboxField';
import { zodResolver } from '@hookform/resolvers/zod';

type LeagueTableProps = {
  data: RouterOutputs['leagues']['list']['leagues'];
};

const LeagueTable = ({ data }: LeagueTableProps) => {
  if (data.length === 0) {
    return <div>No entries.</div>;
  }

  return <Table></Table>;
};

type LeagueCreationDialogProps = {
  open: boolean;
  onClose: () => void;
};

const LeagueCreationDialog = ({ open, onClose }: LeagueCreationDialogProps) => {
  const [invitational, setInvitational] = useState(false);
  const schema = z.object({
    name: z.string().min(1),
    startingPts: z
      .number({
        required_error: 'Starting points is required',
        invalid_type_error: 'Starting points must be a number',
      })
      .step(0.1, 'Starting points must be a multiple of 0.1'),
  });

  const { register, formState } = useForm({
    mode: 'onChange',
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      startingPts: 500.0,
    },
  });

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel className="max-w-lg space-y-4 bg-white p-12">
            <DialogTitle className="font-bold">
              Create League/Tournament
            </DialogTitle>
            <Fieldset className="space-y-6">
              <InputField
                name="name"
                label="League/Tournament Name"
                register={register}
                errors={formState.errors}
                required
              />
              <InputField
                name="startingPts"
                label="Starting Points"
                register={register}
                errors={formState.errors}
                required
                valueAsNumber
              />
              <CheckboxField
                label="Invite-only"
                checked={invitational}
                onChange={setInvitational}
              />
            </Fieldset>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default function LeagueControlPanel() {
  const leagues = trpc.leagues.list.useQuery();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (!leagues.data) return <Loading />;
  return (
    <div className="flex flex-col space-y-1 mt-1">
      <div>
        <Button
          color="green"
          fill="filled"
          onClick={() => setCreateDialogOpen(true)}
          leftIcon={<PlusIcon className="size-4" />}
        >
          Add
        </Button>
      </div>
      <LeagueTable data={leagues.data.leagues} />
      <LeagueCreationDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </div>
  );
}
