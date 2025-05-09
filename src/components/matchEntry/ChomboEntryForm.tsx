import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import MatchPlayerName from '../display/MatchPlayerName';
import Button from '../Button';
import { TrashIcon } from '@heroicons/react/24/solid';
import Text from '../Text';
import { Fieldset } from '@headlessui/react';
import SelectField from '../form/SelectField';
import { renderPlayerName } from '../../utils/usernames';
import TextareaField from '../form/TextareaField';

import { ChomboFormData, CurrentChombos, RankedMatch } from './types';

const chomboFormSchema = z.object({
  description: z.string(),
});

interface ChomboFormElement {
  playerIndex: number;
  description: string;
}

export interface ChomboEntryFormProps {
  initialChombos: CurrentChombos;
  players: RankedMatch['players'];
  onPrev: () => void;
  onNext: (data: ChomboFormData) => void;
}

const ChomboEntryForm = ({
  initialChombos,
  players,
  onPrev,
  onNext,
}: ChomboEntryFormProps) => {
  const [chombos, onChange] = useState<ChomboFormElement[]>(
    initialChombos.map(({ userMatchPlayerPosition, description }) => ({
      playerIndex: (userMatchPlayerPosition ?? 1) - 1,
      description: description ?? '',
    })),
  );

  const { register, formState, getValues, setValue, watch } = useForm({
    mode: 'onBlur',
    resolver: zodResolver(chomboFormSchema),
    defaultValues: { description: '' },
  });

  const [selectedPlayer, setSelectedPlayer] = useState(0);

  const handleRecordChombo = () => {
    const description = getValues('description');
    onChange([...chombos, { playerIndex: selectedPlayer, description }]);
    setValue('description', '');
  };

  const chomboPending = watch('description').length > 0;

  const handleSubmit = () => {
    if (!chomboPending) {
      const data = players.map((): string[] => []);
      for (const { playerIndex, description } of chombos) {
        data[playerIndex].push(description);
      }
      onNext(data);
    }
  };

  return (
    <div>
      <div className="text-sm font-bold">Chombos</div>
      {chombos.length === 0 ? (
        <div className="text-sm">No chombos this match. Yay!</div>
      ) : (
        <div className="flex flex-col gap-1 max-h-48 overflow-auto">
          {chombos.map(({ playerIndex, description }, index) => {
            const handleDelete = () => {
              onChange(chombos.filter((_, i) => i !== index));
            };
            return (
              <div key={index} className="border rounded-lg p-2">
                <div className="flex flex-row justify-between content-center">
                  <div className="text-sm font-bold align-middle">
                    <MatchPlayerName {...players[playerIndex]} />
                  </div>
                  <Button
                    color="red"
                    fill="outlined"
                    icon
                    onClick={handleDelete}
                  >
                    <TrashIcon className="h-4 w-4" />
                    <div className="sr-only">Delete</div>
                  </Button>
                </div>
                <Text className="text-sm">{description}</Text>
              </div>
            );
          })}
        </div>
      )}
      <hr className="h-px my-3 bg-gray-200 border-0" />
      <div className="text-sm font-bold">Record New Chombo</div>
      <Fieldset className="flex flex-col gap-2 mt-1">
        <SelectField
          label="Player"
          displayOption={(i) => renderPlayerName(players[i])}
          options={players.map((_, i) => i)}
          value={selectedPlayer}
          onChange={setSelectedPlayer}
        />
        <TextareaField
          label="Description of Chombo"
          name="description"
          register={register}
          errors={formState.errors}
        />
        <div className="flex flex-row gap-2">
          <Button
            color="red"
            fill="outlined"
            onClick={() => setValue('description', '')}
          >
            Clear
          </Button>
          <Button color="blue" fill="outlined" onClick={handleRecordChombo}>
            Record
          </Button>
        </div>
      </Fieldset>
      <hr className="h-px my-3 bg-gray-200 border-0" />
      <div className="flex flex-row gap-4">
        <Button color="red" fill="outlined" onClick={onPrev}>
          Back
        </Button>
        <Button
          color="green"
          fill="filled"
          onClick={handleSubmit}
          disabled={chomboPending}
        >
          Submit
        </Button>
      </div>
    </div>
  );
};

export default ChomboEntryForm;
