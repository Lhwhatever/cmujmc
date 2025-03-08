import {
  adminProcedure,
  authedProcedure,
  publicProcedure,
  router,
} from '../../trpc';
import makeValkey, { transformXReadResponse } from '../../cache/makeValkey';
import { prisma } from '../../prisma';
import { AdminUserError, NotFoundError } from '../../../protocol/errors';
import { z } from 'zod';
import wwydQuizSchema from '../../../utils/wwyd/basicSchema';
import schema from '../../../protocol/schema';
import { zAsyncIterable } from '../../../protocol/zAsyncIterable';

const makePrefix = (id: number | string) => `wwyd:${id}:`;
const valkey = (id: number | string) => makeValkey(makePrefix(id));

const keys = {
  name: 'name',
  schema: 'schema',
  nextQuestion: 'nextQuestion',
  stream: 'stream',
  players: 'players',
};

const keyRegex = /^wwyd:(\d+):.*$/;

const extractId = (key: string) => {
  const matchArray = keyRegex.exec(key);
  if (matchArray === null) throw `Bad key ${key}`;
  return parseInt(matchArray[1]);
};

const quizRouter = router({
  list: publicProcedure.query(async () => {
    const v = makeValkey();

    const stream = v.scanStream({
      match: makePrefix('*') + keys.name,
    });

    const results: [number, string][] = [];

    for await (const keys of stream) {
      if (keys.length === 0) continue;
      const values = await v.mget(keys);
      for (let i = 0; i < keys.length; ++i) {
        const value = values[i];
        if (value !== null) {
          results.push([extractId(keys[i]), value]);
        }
      }
    }

    return results;
  }),

  play: authedProcedure
    .input(z.number())
    .output(
      zAsyncIterable({
        yield: schema.wwyd.quiz.playOutput,
      }),
    )
    .subscription(async function* ({ input: id, ctx }) {
      const store = valkey(id);

      let fails = 0;
      let nextMsgId = '0';

      if ((await store.get(keys.name)) === null) {
        throw new NotFoundError('wwyd.quiz.play', id);
      }

      try {
        await store.hset(
          keys.players,
          ctx.user.id,
          ctx.user.name ?? 'Anonymous',
        );

        while (true) {
          const response = transformXReadResponse(
            await store.xread(
              'BLOCK',
              300000,
              'STREAMS',
              keys.stream,
              nextMsgId,
            ),
          );

          if (response === null || response[0][1].length === 0) {
            if (++fails >= 10) break;
            continue;
          }

          const results = response[0][1];
          const [id, entry] = results[results.length - 1];
          nextMsgId = id;
          if ('type' in entry && entry.type === 'done') break;
          yield JSON.parse(entry.data);
        }
      } catch (e) {
        console.log('Error', e);
      } finally {
        console.log(`Unsubscribing: ${ctx.user.name}`);
        store.hdel(keys.players, ctx.user.id);
      }
      return;
    }),

  countParticipants: authedProcedure
    .input(z.number())
    .query(({ input: id }) => valkey(id).hlen(keys.players)),

  admin: router({
    host: adminProcedure
      .input(z.number().int())
      .mutation(async ({ input: id }) => {
        const { name, schema } = await prisma.wwyd.findUniqueOrThrow({
          where: { id },
          select: {
            name: true,
            schema: true,
          },
        });

        const store = valkey(id);

        if (!(await store.setnx(keys.name, name))) {
          throw new AdminUserError<{ id: number }>({
            field: 'id',
            message: `WWYD ${id} (name "${name}") is already live! `,
          });
        }

        wwydQuizSchema.parse(schema);
        await store.set(keys.schema, JSON.stringify(schema));
      }),

    delete: adminProcedure
      .input(z.number().int())
      .mutation(async ({ input: id }) => {
        const v = makeValkey();

        const stream = v.scanStream({
          match: makePrefix(id) + '*',
        });

        await stream.forEach(async (keys) => {
          if (keys.length === 0) return;
          await v.del(...keys);
        });
      }),

    restart: adminProcedure
      .input(z.number().int())
      .mutation(async ({ input: id }) => {
        const v = valkey(id);

        const name = await v.get(keys.name);
        if (name === null) {
          throw new NotFoundError('id', id);
        }

        await v.set(keys.nextQuestion, 0);
      }),

    nextQuestion: adminProcedure
      .input(z.number().int())
      .mutation(async ({ input: id }) => {
        const v = valkey(id);
        console.log('Next question!');

        const schemaString = await v.get(keys.schema);
        if (schemaString === null) {
          throw new NotFoundError('id', id);
        }

        const schema = wwydQuizSchema.parse(JSON.parse(schemaString));
        const nextQuestionId = (await v.incr(keys.nextQuestion)) - 1;

        if (nextQuestionId >= schema.scenarios.length) {
          await v.xadd(keys.stream, '*', 'type', 'done');
          return;
        }

        const {
          scenario,
          schema: schemaName,
          version,
          settings: schemaSettings,
        } = schema.scenarios[nextQuestionId];

        const question = {
          scenario,
          schema: schemaName,
          version,
          settings: {
            endDate: Date.now() + schemaSettings.timeLimit * 1000,
          },
        };

        await v.xadd(
          keys.stream,
          '*',
          'type',
          'question',
          'data',
          JSON.stringify(question),
        );
        return nextQuestionId;
      }),
  }),
});

export default quizRouter;
