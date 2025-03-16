import clsx from 'clsx';
import Text from '../Text';
import Button from '../Button';
import { useState } from 'react';

export interface ChomboAffirmationFormProps {
  count: number;
  onPrev: () => void;
  onNext: (commit: boolean) => void;
}

const ChomboAffirmationForm = ({
  count,
  onPrev,
  onNext,
}: ChomboAffirmationFormProps) => {
  const [choice, setChoice] = useState<boolean | null>(null);
  const maskedChoice = count > 0 || choice;

  return (
    <div>
      <div className="text-md font-bold">Report any Chombos</div>
      <div className={clsx(maskedChoice !== null && 'hidden')}>
        <Text>Did any chombos occur during this match?</Text>
        <div className="flex flex-row flex-wrap gap-x-8 gap-y-4 mt-4">
          <Button fill="filled" color="red" onClick={() => setChoice(true)}>
            Yes
          </Button>
          <Button fill="filled" color="green" onClick={() => setChoice(false)}>
            No
          </Button>
        </div>
      </div>
      <div className={clsx(maskedChoice !== false && 'hidden')}>
        <Text>Submit this match with no chombos recorded?</Text>
        <div className="flex flex-row flex-wrap gap-x-8 gap-y-4 mt-4">
          <Button
            fill="outlined"
            color="red"
            onClick={() => {
              setChoice(false);
              onPrev();
            }}
          >
            Back
          </Button>
          <Button fill="filled" color="green" onClick={() => onNext(true)}>
            Submit
          </Button>
        </div>
      </div>
      <div className={clsx(maskedChoice !== false && 'hidden')}>
        <Text>Submit this match with no chombos recorded?</Text>
        <div className="flex flex-row flex-wrap gap-x-8 gap-y-4 mt-4">
          <Button
            fill="outlined"
            color="red"
            onClick={() => {
              setChoice(false);
              onPrev();
            }}
          >
            Back
          </Button>
          <Button fill="filled" color="green" onClick={() => onNext(true)}>
            Submit
          </Button>
        </div>
      </div>
      <div className={clsx(maskedChoice !== true && 'hidden')}>
        <Text>Chombo(s) were reported for this match.</Text>
        <Text>
          After submitting this match, you will need to ask an admin to confirm
          all the match data.
        </Text>
        <div className="flex flex-row flex-wrap gap-x-8 gap-y-4 mt-4">
          <Button
            fill="outlined"
            color="red"
            onClick={() => {
              setChoice(false);
              onPrev();
            }}
          >
            Back
          </Button>
          <Button fill="filled" color="green" onClick={() => onNext(false)}>
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChomboAffirmationForm;
