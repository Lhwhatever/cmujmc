import React from "react";
import { signIn, signOut, useSession } from 'next-auth/react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Session } from 'next-auth';

const LoginButton = () => {
  return (
    <div className="mr-3">
      <button className="block min-w-3 min-h-4 text-slate-400 border-solid border-2 border-slate-400 px-4 py-1 rounded-md" onClick={() => signIn()}>
        Login
      </button>
    </div>
  )
}

type ProfileButtonProps = {
  session: Session
}

const ProfileButton = ({ session }: ProfileButtonProps) => {
  return (
    <div>
      <Menu>
        <MenuButton className="text-white h-full px-2 py-1">{session.user.name}</MenuButton>
        <MenuItems anchor="bottom end" className="[--anchor-gap:.5em]">
          <MenuItem><button className="block min-w-20 text-left hover:bg-lime-400 py-2 px-4 bg-lime-500" onClick={() => signOut()}>Logout</button></MenuItem>
        </MenuItems>
      </Menu>
    </div>
  )
}

export default function Navbar() {
  const session = useSession();

  return (
    <nav className="relative flex w-full flex-wrap items-center justify-between bg-lime-950 py-2 shadow-dark-mild lg:py-4">
      <div className="flex w-full flex-wrap items-center justify-between">
        <div className="ms-2 ml-3">
          <a className="text-xl text-black dark:text-white" href="#">CMU Mahjong</a>
        </div>
        {session.data ? <ProfileButton session={session.data} /> : <LoginButton />}
      </div>
    </nav>)
}
