import { PrismaClient } from '@prisma/client';
import console from 'node:console';
import readline from 'node:readline/promises';
import process from 'node:process';
import { AbortSignal } from 'next/dist/compiled/@edge-runtime/primitives';

const prisma = new PrismaClient();

async function main() {
  if (await prisma.user.findFirst({ where: { admin: true }}) !== null) return;
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.warn("No users in database, could not promote one to admin.");
    return;
  }

  console.log("Promote a user to admin:");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const pageSize = 5;
  let page = 0;
  let promotee: number | undefined = undefined;
  while (true) {
    const start = page * pageSize;
    const end = (page + 1) * pageSize;

    const signal = AbortSignal.timeout(10_000);

    const result = await rl.question([
      'Select one of the following choices:',
      ...users.slice(start, end).map((data, index) =>
        `[${index + 1}] ${data.displayName} (${data.name})`
      ),
      [
        page == 0 && '[p] - previous',
        end >= users.length && '[n] - next',
        '[q] - quit',
      ].filter(x => !!x).join(', '),
      ''
    ].join('\n'), { signal });

    const trimmed = result.trim().toLowerCase();
    console.log(`Got: ${trimmed}`);
    if (trimmed === 'p') {
      if (page > 0) {
        --page;
      } else {
        console.error("Cannot return to previous page, try again.");
      }
      continue;
    }

    if (trimmed === 'n') {
      if (end < users.length) {
        ++page;
      } else {
        console.error("Cannot go to next page, try again.");
      }
      continue;
    }

    if (trimmed === 'q') {
      break;
    }

    const pageIdx = parseInt(trimmed);
    if (Number.isNaN(pageIdx)) {
      console.error("Unknown input, try again");
      continue;
    }

    const arrayIdx = start + pageIdx - 1;
    if (start <= arrayIdx && arrayIdx < end) {
      promotee = arrayIdx;
      break;
    }

    console.error("Bad input, try again");
  }
  rl.close();

  if (promotee === undefined) {
    console.log("Not promoting anyone to admin.");
    return;
  }

  const user = await prisma.user.update({
    where: { id: users[promotee].id },
    data: { admin: true }
  });

  console.log(`Promoted ${user.name} to admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
