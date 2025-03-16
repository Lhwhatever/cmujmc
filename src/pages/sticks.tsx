import React from 'react';
import Page from '../components/Page';
import Heading from '../components/Heading';
import StickInput from '../components/matchEntry/StickInput';

export default function SticksInputPage() {
  const [total, setTotal] = React.useState(0);

  return (
    <Page>
      <Heading level="h3">Point Stick Adder</Heading>
      <Heading level="h5">Total = {total}</Heading>
      <StickInput pointStickStyle="modern" onChange={setTotal} />
    </Page>
  );
}
