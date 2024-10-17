import React, { useState } from 'react';
import Table, { TableCell, TableHeading, TableRow } from '../Table';
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
import ComboboxField from '../form/ComboboxField';
import Fuse, { FuseResult } from 'fuse.js';
import TextareaField from '../form/TextareaField';
import { useRouter } from 'next/router';

type DateRangeCellProps = {
  startDate?: Date | null;
  endDate?: Date | null;
};

const DateRangeCell = ({ startDate, endDate }: DateRangeCellProps) => {
  if (startDate) {
    if (endDate) {
      return (
        <TableCell className="flex flex-row">
          <div>{startDate.toLocaleDateString()} to</div>
          <div>{endDate.toLocaleDateString()}</div>
        </TableCell>
      );
    } else {
      return <TableCell>Starts {startDate.toLocaleDateString()}</TableCell>;
    }
  } else {
    if (endDate) {
      return <TableCell>Ends {endDate.toLocaleDateString()}</TableCell>;
    } else {
      return <TableCell>No start/end</TableCell>;
    }
  }
};

type LeagueTableProps = {
  data: RouterOutputs['leagues']['list']['leagues'];
};

const LeagueTable = ({ data }: LeagueTableProps) => {
  const router = useRouter();
  if (data.length === 0) {
    return <div>No entries.</div>;
  }

  return (
    <Table
      head={
        <TableRow>
          <TableHeading scope="col">Name</TableHeading>
          <TableHeading scope="col">Dates</TableHeading>
          <TableHeading scope="col">Ruleset</TableHeading>
        </TableRow>
      }
    >
      {data.map((league) => (
        <TableRow
          key={league.id}
          className="cursor-pointer hover:bg-green-100"
          onClick={() => router.push(`/league/${league.id}`)}
        >
          <TableHeading scope="row" className="flex flex-col">
            <div className="underline decoration-dotted">{league.name}</div>
            {league.invitational && (
              <div className="text-xs italic">Invite-only</div>
            )}
          </TableHeading>
          <DateRangeCell
            startDate={league.startDate}
            endDate={league.endDate}
          />
          <TableCell>{league.defaultRuleset.name}</TableCell>
        </TableRow>
      ))}
    </Table>
  );
};

type LeagueCreationDialogProps = {
  open: boolean;
  onClose: () => void;
};

type Ruleset = RouterOutputs['rulesets']['list']['rulesets'][number];

const filterRulesets = (
  query: string,
  rulesets?: Ruleset[],
): Ruleset[] | null => {
  if (rulesets === undefined) return null;
  if (!query) return rulesets;
  const fuse = new Fuse(rulesets, { keys: ['name'] });
  return fuse.search(query).map((r: FuseResult<Ruleset>) => r.item);
};

const leagueCreationSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  startingPoints: z
    .number({
      required_error: 'Starting rating is required',
      invalid_type_error: 'Starting rating must be a number',
    })
    .step(0.1, 'Starting rating must be a multiple of 0.1'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

type LeagueCreationParams = z.infer<typeof leagueCreationSchema>;

const defaultLeagueCreationParamValues: LeagueCreationParams = {
  name: '',
  startingPoints: 500.0,
  description: '',
  startDate: undefined,
  endDate: undefined,
};

const LeagueCreationDialog = ({ open, onClose }: LeagueCreationDialogProps) => {
  const [invitational, setInvitational] = useState(false);
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [rulesetQuery, setRulesetQuery] = useState('');

  const { register, formState, handleSubmit } = useForm({
    mode: 'onChange',
    resolver: zodResolver(leagueCreationSchema),
    defaultValues: defaultLeagueCreationParamValues,
  });

  const allRulesets = trpc.rulesets.list.useQuery();
  const filteredRulesets = filterRulesets(
    rulesetQuery,
    allRulesets?.data?.rulesets,
  );
  const displayRuleset = (ruleset: Ruleset | null) => ruleset?.name ?? '';

  const createLeague = trpc.leagues.create.useMutation().mutateAsync;

  const onSubmit = async (data: LeagueCreationParams) => {
    if (ruleset === null) return;
    try {
      await createLeague({
        ...data,
        invitational,
        defaultRulesetId: ruleset.id,
      });
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

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
                type="text"
                required
              />
              <InputField
                name="startingPoints"
                label="Starting Rating"
                register={register}
                errors={formState.errors}
                required
                type="number"
                step={0.1}
              />
              <ComboboxField
                required
                label="Ruleset"
                value={ruleset}
                query={rulesetQuery}
                onQueryChange={setRulesetQuery}
                onChange={setRuleset}
                displayValue={displayRuleset}
                options={filteredRulesets}
              />
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
              <CheckboxField
                label="Invite-only"
                checked={invitational}
                onChange={setInvitational}
              />
              <TextareaField
                name="description"
                label="Description"
                register={register}
                errors={formState.errors}
              />
              <div className="flex flex-row">
                <Button
                  color="green"
                  fill="filled"
                  onClick={handleSubmit(onSubmit)}
                >
                  Submit
                </Button>
                <Button color="red" fill="filled" onClick={onClose}>
                  Cancel
                </Button>
              </div>
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
