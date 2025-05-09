import { useState } from 'react';
import Table, { TableCell, TableHeading, TableRow } from '../Table';
import { RouterOutputs, trpc } from '../../utils/trpc';
import Button from '../Button';
import { Fieldset } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import InputField from '../form/InputField';
import { z } from 'zod';
import CheckboxField from '../form/CheckboxField';
import { zodResolver } from '@hookform/resolvers/zod';
import ComboboxField from '../form/ComboboxField';
import Fuse, { FuseResult } from 'fuse.js';
import TextareaField from '../form/TextareaField';
import { useRouter } from 'next/router';
import schema from '../../protocol/schema';
import DateTimeRange from '../DateTimeRange';
import Dialog from '../Dialog';
import Loading from '../Loading';

interface LeagueTableProps {
  data: RouterOutputs['leagues']['list']['leagues'];
}

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
          onClick={() => void router.push(`/league/${league.id}`)}
        >
          <TableHeading scope="row" className="flex flex-col space-y-0">
            <div className="underline decoration-dotted m-0">{league.name}</div>
            {league.invitational && (
              <div className="text-xs italic m-0">Invite-only</div>
            )}
          </TableHeading>
          <TableCell className="text-wrap">
            <DateTimeRange
              startDate={league.startDate}
              endDate={league.endDate}
            />
          </TableCell>
          <TableCell>{league.defaultRuleset.name}</TableCell>
        </TableRow>
      ))}
    </Table>
  );
};

interface LeagueCreationDialogProps {
  open: boolean;
  onClose: () => void;
}

type Ruleset = RouterOutputs['rulesets']['list']['rulesets'][number];

const filterRulesets = (
  query: string,
  rulesets?: Ruleset[],
): Ruleset[] | undefined => {
  if (rulesets === undefined) return undefined;
  if (!query) return rulesets;
  const fuse = new Fuse(rulesets, { keys: ['name'] });
  return fuse.search(query).map((r: FuseResult<Ruleset>) => r.item);
};

const leagueCreationSchema = schema.league.create.omit({
  invitational: true,
  defaultRulesetId: true,
});

type LeagueCreationParams = z.infer<typeof leagueCreationSchema>;

const defaultLeagueCreationParamValues: LeagueCreationParams = {
  name: '',
  startingPoints: 500.0,
  matchesRequired: 3,
  description: '',
  startDate: undefined,
  endDate: undefined,
};

const LeagueCreationDialog = ({ open, onClose }: LeagueCreationDialogProps) => {
  const [invitational, setInvitational] = useState(false);
  const [singleEvent, setSingleEvent] = useState(false);
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

  const utils = trpc.useUtils();
  const mutation = trpc.leagues.create.useMutation({
    onSuccess() {
      onClose();
      return utils.leagues.list.invalidate();
    },
  });

  const onSubmit = async (data: LeagueCreationParams) => {
    if (ruleset === null) return;
    mutation.mutate(
      {
        ...data,
        invitational,
        singleEvent,
        defaultRulesetId: ruleset.id,
      },
      {
        onSuccess() {
          onClose();
        },
        onError(e) {
          alert(e.message);
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} title="Create League/Tournament">
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
        <InputField
          name="matchesRequired"
          label="Matches required for rank"
          register={register}
          errors={formState.errors}
          required
          type="number"
          step={1}
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
          isLoading={allRulesets.isLoading}
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
        <CheckboxField
          label="Single-event league"
          checked={singleEvent}
          onChange={setSingleEvent}
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
            onClick={() => void handleSubmit(onSubmit)()}
          >
            Submit
          </Button>
          <Button color="red" fill="filled" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </Fieldset>
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
