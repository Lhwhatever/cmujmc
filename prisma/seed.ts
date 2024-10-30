/**
 * Adds seed data to your db
 *
 * @link https://www.prisma.io/docs/guides/database/seed-database
 */
import { PrismaClient, GameMode, Prisma } from '@prisma/client';
import process from 'node:process';
import console from 'node:console';
import * as readline from 'node:readline/promises';
import { AbortSignal } from 'next/dist/compiled/@edge-runtime/primitives';

const prisma = new PrismaClient();

const rulesets: Prisma.RulesetCreateInput[] = [
  {
    gameMode: GameMode.YONMA,
    name: 'WRC 2022 Default',
    description:
      'Rules used in the World Riichi Championships of 2022 in Vienna',
    payload: { akadora: 0 },
    startPts: 30000,
    returnPts: 30000,
    uma: {
      create: [
        { position: 1, value: +15 },
        { position: 2, value: +5 },
        { position: 3, value: -5 },
        { position: 4, value: -15 },
      ],
    },
    chomboDelta: -30.0,
  },
  {
    gameMode: GameMode.YONMA,
    name: 'M-League 2024-25',
    description: 'Rules used in M-League 2024-25',
    payload: { akadora: 3 },
    startPts: 25000,
    returnPts: 30000,
    uma: {
      create: [
        { position: 1, value: +50 },
        { position: 2, value: +10 },
        { position: 3, value: -10 },
        { position: 4, value: -30 },
      ],
    },
    chomboDelta: -30.0,
  },
  {
    gameMode: GameMode.YONMA,
    name: 'Club League v2',
    description: 'Rules used in Club League',
    payload: { akadora: 3 },
    startPts: 25000,
    returnPts: 25000,
    uma: {
      create: [
        { position: 1, value: +30 },
        { position: 2, value: +10 },
        { position: 3, value: -10 },
        { position: 4, value: -30 },
      ],
    },
    chomboDelta: -20.0,
  },
];

async function seedRulesets() {
  if ((await prisma.ruleset.findFirst()) !== null) return;
  console.log('No rulesets found, seeding...');
  for (const data of rulesets) {
    console.log(`Adding ruleset ${data.name}`);
    await prisma.ruleset.create({ data });
  }
}

async function seedAdmin() {
  if ((await prisma.user.findFirst({ where: { admin: true } })) !== null)
    return;
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.warn('No users in database, could not promote one to admin.');
    return;
  }

  console.log('Promote a user to admin:');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const pageSize = 5;
  let page = 0;
  let promotee: number | undefined = undefined;
  while (true) {
    const start = page * pageSize;
    const end = (page + 1) * pageSize;

    const signal = AbortSignal.timeout(10_000);

    const result = await rl.question(
      [
        'Select one of the following choices:',
        ...users
          .slice(start, end)
          .map(
            (data, index) =>
              `[${index + 1}] ${data.displayName} (${data.name})`,
          ),
        [
          page == 0 && '[p] - previous',
          end >= users.length && '[n] - next',
          '[q] - quit',
        ]
          .filter((x) => !!x)
          .join(', '),
        '',
      ].join('\n'),
      { signal },
    );

    const trimmed = result.trim().toLowerCase();
    console.log(`Got: ${trimmed}`);
    if (trimmed === 'p') {
      if (page > 0) {
        --page;
      } else {
        console.error('Cannot return to previous page, try again.');
      }
      continue;
    }

    if (trimmed === 'n') {
      if (end < users.length) {
        ++page;
      } else {
        console.error('Cannot go to next page, try again.');
      }
      continue;
    }

    if (trimmed === 'q') {
      break;
    }

    const pageIdx = parseInt(trimmed);
    if (Number.isNaN(pageIdx)) {
      console.error('Unknown input, try again');
      continue;
    }

    const arrayIdx = start + pageIdx - 1;
    if (start <= arrayIdx && arrayIdx < end) {
      promotee = arrayIdx;
      break;
    }

    console.error('Bad input, try again');
  }
  rl.close();

  if (promotee === undefined) {
    console.log('Not promoting anyone to admin.');
    return;
  }

  const user = await prisma.user.update({
    where: { id: users[promotee].id },
    data: { admin: true },
  });

  console.log(`Promoted ${user.name} to admin.`);
}

async function main() {
  await seedAdmin();
  await seedRulesets();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
