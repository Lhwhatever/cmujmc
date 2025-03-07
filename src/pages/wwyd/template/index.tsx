import Page from '../../../components/Page';
import Button from '../../../components/Button';
import { RouterOutputs, trpc } from '../../../utils/trpc';
import { useRouter } from 'next/router';
import Loading from '../../../components/Loading';
import Heading from '../../../components/Heading';
import DateTime from '../../../components/DateTime';
import ButtonLink from '../../../components/ButtonLink';

type WwydTemplate =
  RouterOutputs['wwyd']['template']['list']['templates'][number];

interface TemplateListingProps {
  template: WwydTemplate;
}

const TemplateListing = ({ template }: TemplateListingProps) => {
  const router = useRouter();
  const host = trpc.wwyd.quiz.admin.host.useMutation();

  const handleHost = async () => {
    try {
      await host.mutateAsync(template.id, {
        async onError(error) {
          alert(error.message);
        },
      });
    } catch (_) {
    } finally {
      router.push(`/wwyd/${template.id}/admin`);
    }
  };

  return (
    <div className="rounded-md p-4 border border-gray-400 drop-shadow-2xl w-full">
      <Heading level="h5">{template.name || 'Untitled'}</Heading>
      <p>
        Last updated <DateTime date={template.updated} relative /> &middot;
        Created <DateTime date={template.created} relative />
      </p>
      <div className="mt-2 flex flex-row gap-2">
        <ButtonLink
          color="blue"
          fill="outlined"
          href={`/wwyd/template/${template.id}`}
        >
          Edit
        </ButtonLink>
        <Button color="blue" fill="filled" onClick={handleHost}>
          Host
        </Button>
      </div>
    </div>
  );
};

const TemplateList = () => {
  const listings = trpc.wwyd.template.list.useQuery();
  if (listings.data === undefined) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div>
        Showing {listings.data.templates.length} of {listings.data.count}{' '}
        template(s)
      </div>
      {listings.data.templates.map((template) => (
        <TemplateListing key={template.id} template={template} />
      ))}
    </div>
  );
};

export default function WwydTemplateList() {
  const router = useRouter();

  const create = trpc.wwyd.template.create.useMutation({
    async onSuccess({ id }) {
      await router.push(`/wwyd/template/${id}`);
    },
  });

  const handleCreate = () => {
    void create.mutateAsync();
  };

  return (
    <Page>
      <div className="flex flex-col">
        <div className="flex flex-row mb-2 gap-4">
          <Button color="yellow" fill="filled" onClick={() => router.back()}>
            Back
          </Button>
          <Button color="green" fill="filled" onClick={handleCreate}>
            Create
          </Button>
        </div>
        <TemplateList />
      </div>
    </Page>
  );
}

WwydTemplateList.auth = {
  role: 'admin',
  unauthorizedRedirect: '/wwyd',
};
