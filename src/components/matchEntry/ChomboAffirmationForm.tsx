import clsx from 'clsx';
import Text from '../Text';
import Button from '../Button';

interface ChomboAffirmationFormProps {
  hidden?: boolean;
  onBack: () => void;
  onSubmit: (chombos?: [number, string][]) => void;
}

const ChomboAffirmationForm = ({
  hidden,
  onBack,
  onSubmit,
}: ChomboAffirmationFormProps) => {
  return (
    <div className={clsx(hidden && 'hidden')}>
      <div className="text-md font-bold">Report any Chombos</div>
      <Text>
        If a chombo occurred during the match, please find an admin to help you
        complete recording the match. Otherwise, you may submit the match.
      </Text>
      <div className="flex flex-row flex-wrap gap-x-8 gap-y-4 mt-4">
        <Button fill="outlined" color="red" onClick={onBack}>
          Back
        </Button>
        <Button fill="filled" color="red" onClick={() => onSubmit(undefined)}>
          Report Chombos
        </Button>
        <Button fill="filled" color="blue" onClick={() => onSubmit([])}>
          No Chombos (Submit)
        </Button>
      </div>
    </div>
  );
};

export default ChomboAffirmationForm;
