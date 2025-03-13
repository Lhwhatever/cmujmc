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
import Button from '../../../components/Button';
import { z } from 'zod';
import wwydQuizSchema from '../../../utils/wwyd/basicSchema';
import ButtonLink from '../../../components/ButtonLink';

const wwydFormSchema = z.object({
  name: z.string(),
  schema: z.string().superRefine((s, ctx) => {
    try {
      const jsonObject = JSON.parse(s);
      const result = wwydQuizSchema.safeParse(jsonObject);
      if (!result.success) {
        for (const { path, message, ...other } of result.error.issues) {
          ctx.addIssue({
            path: [],
            message: `Field: ${path} | ${message}`,
            ...other,
          });
        }
      }
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Not a valid JSON object: ${e}`,
        fatal: true,
      });
    }
  }),
});

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
      void utils.wwyd.template.list.invalidate();
      void utils.wwyd.template.get.invalidate(id);
      return router.push('/wwyd/template');
    },
    async onError(error) {
      alert(error.message);
    },
  });

  const { register, formState, handleSubmit } = useForm({
    mode: 'onBlur',
    resolver: zodResolver(wwydFormSchema),
    defaultValues: { name, schema: JSON.stringify(schema, null, 4) },
  });

  const onSubmit = async () => {
    handleSubmit(
      async ({ name, schema: schemaString }) => {
        const schema = wwydQuizSchema.parse(JSON.parse(schemaString));
        await update.mutateAsync({ id, data: { name, schema } });
      },
      (error) => alert(JSON.stringify(error)),
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
        <div className="flex flex-row gap-2">
          <ButtonLink color="red" fill="outlined" href="/wwyd/template">
            Back
          </ButtonLink>
          <Button color="green" fill="filled" onClick={onSubmit}>
            Submit
          </Button>
        </div>
      </Fieldset>
    </>
  );
};

interface WwydTemplateProps {
  id: number;
}

const WwydTemplate = ({ id }: WwydTemplateProps) => {
  const router = useRouter();
  const query = trpc.wwyd.template.get.useQuery(id, { retry: 3 });

  useEffect(() => {
    if (query.isError) {
      void router.back();
    }
  }, [router, query.isError]);

  if (!query.data) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  return <WwydForm name={query.data.name} schema={query.data.schema} id={id} />;
};

export default function WwydTemplatePage() {
  const router = useRouter();
  const id = parseInt(router.query.id as string);

  useEffect(() => {
    if (Number.isNaN(id)) {
      void router.back();
    }
  }, [router, id]);

  return (
    <Page>{Number.isNaN(id) ? <Loading /> : <WwydTemplate id={id} />}</Page>
  );
}

WwydTemplateList.auth = {
  role: 'admin',
  unauthorizedRedirect: '/wwyd',
};
