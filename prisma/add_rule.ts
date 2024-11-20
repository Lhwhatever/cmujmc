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
    name: '98-179 StuCo Tournament v3',
    description: 'Rules used in the 98-179 StuCo starting Fall 2024',
    payload: { akadora: 3 },
    startPts: 25000,
    returnPts: 25000,
    uma: {
      create: [
        { position: 1, value: +15 },
        { position: 2, value: +5 },
        { position: 3, value: -5 },
        { position: 4, value: -15 },
      ],
    },
    chomboDelta: -20.0,
  },
];

async function seedRulesets() {
  for (const data of rulesets) {
    console.log(`Adding ruleset ${data.name}`);
    await prisma.ruleset.create({ data });
  }
}

async function main() {
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
