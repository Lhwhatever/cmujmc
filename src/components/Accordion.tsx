import React from 'react';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

export interface AccordionSegmentProps {
  heading: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

export const AccordionSegment = ({
  heading,
  children,
  defaultOpen,
}: AccordionSegmentProps) => {
  return (
    <Disclosure as="div" className="m-1 p-4" defaultOpen={defaultOpen}>
      <DisclosureButton className="group flex w-full items-center justify-between">
        {heading}
        <ChevronDownIcon className="size-5 fill-black/60 group-data-[hover]:fill-black/50 group-data-[open]:rotate-180" />
      </DisclosureButton>
      <DisclosurePanel className="mt-2 text-sm/5 text-black/50 divide-y divide-gray/5">
        {children}
      </DisclosurePanel>
    </Disclosure>
  );
};

export interface AccordionProps {
  children?: React.ReactNode;
}

export default function Accordion({ children }: AccordionProps) {
  return (
    <div className="mx-auto w-full divide-y divide-gray/5 rounded-xl shadow">
      {children}
    </div>
  );
}
