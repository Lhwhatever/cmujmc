import React from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Session } from 'next-auth';
import Button from './Button';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import Link from 'next/link';

const LoginButton = () => {
  return (
    <div className="mr-3">
      <Button color="yellow" fill="outlined" onClick={() => void signIn()}>
        Login
      </Button>
    </div>
  );
};

type ProfileButtonProps = {
  session: Session;
};

const ProfileButton = ({ session }: ProfileButtonProps) => {
  return (
    <div>
      <Menu>
        <MenuButton className="text-white h-full px-2 py-1 inline-flex items-center">
          {session.user.name} <ChevronDownIcon className="size-4" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          className="[--anchor-gap:.5em] bg-lime-200 rounded-lg shadow w-48 mt-2 flex flex-col"
        >
          <MenuItem>
            <div className="block px-4 py-2 text-left hover:bg-lime-400">
              <Link href="/profile/edit">Update Profile</Link>
            </div>
          </MenuItem>
          <MenuItem>
            <button
              className="block px-4 py-2 text-left hover:bg-lime-400"
              onClick={() => void signOut()}
            >
              Logout
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  );
};

export default function Navbar() {
  const session = useSession();

  return (
    <nav className="relative flex w-full flex-wrap items-center justify-between bg-lime-950 py-2 shadow-dark-mild lg:py-4">
      <div className="flex w-full flex-wrap items-center justify-between">
        <div className="ms-2 ml-3">
          <Link className="text-xl text-black dark:text-white" href="/">
            CMU Mahjong
          </Link>
        </div>
        {session.data ? (
          <ProfileButton session={session.data} />
        ) : (
          <LoginButton />
        )}
      </div>
    </nav>
  );
}
