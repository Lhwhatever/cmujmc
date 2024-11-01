import { PrismaClient, Status } from '@prisma/client';
import console from 'node:console';
import process from 'node:process';
import readline from 'node:readline/promises';
import { computeTransactions, umaSelector } from './utils/scoring';

const prisma = new PrismaClient();

async function queryUser<T>(
  rl: readline.Interface,
  prompt: string,
  choices: T[],
  fmt: (t: T) => string,
) {
  if (choices.length === 0) throw 'Empty';
  const response = await rl.question(
    [prompt, ...choices.map((t, i) => `[${i}] ${fmt(t)}`), ''].join('\n'),
  );
  const index = parseInt(response.trim().toLowerCase());
  if (!Number.isNaN(index) && 0 <= index && index < choices.length) {
    const choice = choices[index];
    console.log(`You chose: ${fmt(choice)}`);
    return choice;
  }
  throw `Unexpected ${index}`;
}

async function main() {
  console.log('Finding users.');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const users = await prisma.user.findMany({
    where: {
      leagues: {
        some: {},
      },
    },
    include: {
      leagues: {
        include: { league: true },
      },
    },
  });

  const user = await queryUser(
    rl,
    'Select a name by index from the list below. The user can only be chosen if they have registered for a league.',
    users,
    ({ name, displayName }) => `Name: ${name}, Display: ${displayName}`,
  );

  const userLeague =
    user.leagues.length === 1
      ? user.leagues[0]
      : await queryUser(
          rl,
          'Choose a league from the list below:',
          user.leagues,
          ({ league }) => league.name,
        );

  const userMatches = await prisma.userMatch.findMany({
    where: {
      unregisteredPlaceholder: { not: null },
      match: {
        status: Status.COMPLETE,
        parent: {
          parent: { id: userLeague.league.id },
        },
        players: {
          none: {
            playerId: user.id,
          },
        },
      },
    },
    include: {
      match: {
        include: {
          ruleset: {
            include: {
              uma: umaSelector,
            },
          },
        },
      },
    },
  });

  let guestNames = new Set<string>();
  for (const { unregisteredPlaceholder } of userMatches) {
    guestNames = guestNames.add(unregisteredPlaceholder!);
  }

  const guest = await queryUser(
    rl,
    'Choose a guest from the following list',
    Array.from(guestNames.values()),
    (x) => x,
  );

  const matches = userMatches.filter(
    ({ unregisteredPlaceholder }) => unregisteredPlaceholder === guest,
  );

  let freeChombos = userLeague.freeChombos;
  const allTxns = [];

  for (const match of matches) {
    const { txns, chombos } = computeTransactions({
      ...match,
      playerId: user.id,
      returnPts: match.match.ruleset.returnPts,
      uma: match.match.ruleset.uma.map(({ value }) => value),
      rawScore: match.rawScore!,
      placementMin: match.placementMin!,
      placementMax: match.placementMax!,
      chombos: match.chombos!,
      time: match.match.time,
      leagueId: userLeague.league.id,
      freeChombos,
      chomboDelta: match.match.ruleset.chomboDelta,
    });
    allTxns.push(...txns);
    if (freeChombos !== null) freeChombos -= chombos;
  }

  if (freeChombos !== null) freeChombos = Math.max(freeChombos, 0);

  console.log('Chombo allowance left:', freeChombos);
  console.log(allTxns);

  const response = await rl.question('Do you accept these changes?');
  if (response !== 'y') {
    rl.close();
    return;
  }

  await prisma.$transaction([
    prisma.userMatch.updateMany({
      where: {
        unregisteredPlaceholder: guest,
        match: {
          status: Status.COMPLETE,
          parent: {
            parent: { id: userLeague.league.id },
          },
        },
      },
      data: {
        unregisteredPlaceholder: null,
        playerId: user.id,
      },
    }),
    prisma.userLeague.update({
      where: {
        leagueId_userId: {
          leagueId: userLeague.league.id,
          userId: user.id,
        },
      },
      data: { freeChombos },
    }),
    prisma.userLeagueTransaction.createMany({
      data: allTxns,
    }),
  ]);

  console.log('Done!');
  rl.close();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
