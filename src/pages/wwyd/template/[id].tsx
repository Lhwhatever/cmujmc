import WwydTemplateList from './index';
import Page from '../../../components/Page';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Fieldset } from '@headlessui/react';
import { useRouter } from 'next/router';
import { trpc } from '../../../utils/trpc';
import Loading from '../../../components/Loading';
import { useEffect } from 'react';
import InputField from '../../../components/form/InputField';
import { JSONValue } from 'superjson/src/types';
import TextareaField from '../../../components/form/TextareaField';
import schema from '../../../protocol/schema';
import Button from '../../../components/Button';

const wwydFormSchema = schema.wwyd.template.edit.shape.data;

interface WwydFormProps {
  id: number;
  name: string;
  schema: JSONValue;
}

const WwydForm = ({ id, name, schema }: WwydFormProps) => {
  const router = useRouter();
  const utils = trpc.useUtils();

  const update = trpc.wwyd.template.edit.useMutation({
    async onSuccess() {
      utils.wwyd.template.list.invalidate();
      utils.wwyd.template.get.invalidate(id);
      return router.push('/wwyd/template');
    },
    async onError(error) {
      alert(error);
    },
  });

  const { register, formState, handleSubmit } = useForm({
    mode: 'onBlur',
    resolver: zodResolver(wwydFormSchema),
    defaultValues: { name, schema: JSON.stringify(schema, null, 4) },
  });

  const onSubmit = async () => {
    handleSubmit(
      (data) => update.mutateAsync({ id, data }),
      (error) => alert(error),
    )();
  };

  return (
    <>
      <Fieldset className="flex flex-col gap-4">
        <InputField
          name="name"
          label="WWYD Name"
          register={register}
          errors={formState.errors}
        />
        <TextareaField
          name="schema"
          label="Schema"
          className="font-mono"
          register={register}
          errors={formState.errors}
        />
        <div>
          <Button color="green" fill="filled" onClick={onSubmit}>
            Submit
          </Button>
        </div>
      </Fieldset>
    </>
  );
};

export default function WwydTemplate() {
  const router = useRouter();
  const id = parseInt(router.query.id as string);

  const query = trpc.wwyd.template.get.useQuery(id, { retry: 3 });

  useEffect(() => {
    if (query.isError) {
      void router.push('/wwyd/template');
    }
  }, [router, query.isError]);

  if (!query.data) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  return (
    <Page>
      <WwydForm name={query.data.name} schema={query.data.schema} id={id} />
    </Page>
  );
}

WwydTemplateList.auth = {
  role: 'admin',
  unauthorizedRedirect: '/wwyd',
};
