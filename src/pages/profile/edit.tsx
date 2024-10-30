import React from 'react';
import Page from '../../components/Page';
import Heading from '../../components/Heading';
import { useSession } from 'next-auth/react';
import { Fieldset } from '@headlessui/react';
import InputField from '../../components/form/InputField';
import { trpc } from '../../utils/trpc';
import Loading from '../../components/Loading';
import Table, {
  TableCell,
  TableHeading,
  TableRow,
} from '../../components/Table';
import DateTime from '../../components/DateTime';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import schema from '../../protocol/schema';
import Button from '../../components/Button';
import { useRouter } from 'next/router';

type ProfileFormProps = {
  name: string | null;
  displayName: string | null;
};

const ProfileForm = ({ name, displayName }: ProfileFormProps) => {
  const router = useRouter();
  const session = useSession();
  const utils = trpc.useUtils();

  const { register, formState, handleSubmit } = useForm({
    resolver: zodResolver(schema.user.updateProfile),
    defaultValues: { name: name ?? '', displayName: displayName ?? '' },
  });

  const update = trpc.user.updateProfile.useMutation({
    async onSuccess() {
      await session.update();
      await utils.user.self.invalidate();
      return router.push('/');
    },
  });

  const handleUpdate = () => {
    void handleSubmit((data) => update.mutateAsync(data))();
  };

  return (
    <Fieldset className="flex flex-col gap-4">
      <InputField
        name="name"
        register={register}
        errors={formState.errors}
        label="Name"
        description="IRL Name. Optional, will only be shown to logged in users."
      />
      <InputField
        name="displayName"
        register={register}
        errors={formState.errors}
        label="Display Name"
        description="Name to display on leaderboards."
      />
      <div>
        <Button color="green" fill="filled" onClick={handleUpdate}>
          Update
        </Button>
      </div>
    </Fieldset>
  );
};

export default function EditProfilePage() {
  useSession({ required: true });
  const query = trpc.user.self.useQuery();

  if (!query.data) {
    return (
      <Page>
        <Heading level="h2">Update Profile</Heading>
        <Loading />
      </Page>
    );
  }

  const { self } = query.data;

  return (
    <Page>
      <Heading level="h2">Update Profile</Heading>
      <Table className="mb-4">
        <TableRow>
          <TableHeading scope="row">Email</TableHeading>
          <TableCell>
            {self.email} {self.emailVerified && ' (Verified)'}
          </TableCell>
        </TableRow>
        <TableRow>
          <TableHeading scope="row">Joined</TableHeading>
          <TableCell>
            <DateTime date={self.createdAt} />
          </TableCell>
        </TableRow>
        <TableRow>
          <TableHeading scope="row">Andrew ID</TableHeading>
          <TableCell>{self.andrew}</TableCell>
        </TableRow>
      </Table>
      <ProfileForm name={self.name} displayName={self.displayName} />
    </Page>
  );
}
