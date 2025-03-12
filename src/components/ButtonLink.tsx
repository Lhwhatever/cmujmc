import Button, { ButtonProps } from './Button';
import NextLink, { LinkProps } from 'next/link';

export type ButtonLinkProps<RouteInferType = never> = Omit<
  ButtonProps<'a'>,
  'href'
> &
  Pick<LinkProps<RouteInferType>, 'href'>;

export default function ButtonLink(props: ButtonLinkProps) {
  return <Button {...props} as={NextLink} />;
}
