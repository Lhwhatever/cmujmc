import {
  adminProcedure,
  authedProcedure,
  publicProcedure,
  router,
} from '../../trpc';
import makeValkey, { VStream } from '../../cache/makeValkey';
import { prisma } from '../../prisma';
import { AdminUserError, NotFoundError } from '../../../protocol/errors';
import { z } from 'zod';
import wwydQuizSchema, { moveSchema } from '../../../utils/wwyd/basicSchema';
import schema from '../../../protocol/schema';
import { zAsyncIterable } from '../../../protocol/zAsyncIterable';

const makePrefix = (id: number | string) => `wwyd:${id}:`;
const valkey = makeValkey(makePrefix);

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

type StreamElement = z.infer<typeof schema.wwyd.quiz.playOutput>;

const quizRouter = router({
  list: publicProcedure.query(async () => {
    const v = valkey();
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
    .output(zAsyncIterable({ yield: schema.wwyd.quiz.playOutput }))
    .subscription(async function* ({ input: id, ctx }) {
      const store = valkey(id);
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

        const stream = new VStream<StreamElement>(store, keys.stream);

        while (true) {
          const results = await stream.xread(nextMsgId, {
            blockMs: 300000,
            retries: 5,
          });

          if (results === null) {
            throw new Error(
              `Too many retries: play subscription ${id}, user: ${ctx.user.name}`,
            );
          }

          if (results.length === 0) continue;

          const lastEntry = results[results.length - 1];
          if (lastEntry.entry.type === 'done') break;
          nextMsgId = lastEntry.id;

          const lastQuestionIdx = Math.max(
            0,
            results.findLastIndex((value) => value.entry.type === 'question'),
          );

          for (let i = lastQuestionIdx; i < results.length; ++i) {
            yield results[i].entry;
          }
        }
        yield { type: 'done' };
      } catch (e) {
        console.error('Error in play', e);
      } finally {
        store.hdel(keys.players, ctx.user.id);
      }
      return;
    }),

  submit: authedProcedure.input(moveSchema).mutation(async ({ input, ctx }) => {
    console.log(ctx.user.name, ': ', input);
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
        const v = valkey();

        const stream = v.scanStream({
          match: makePrefix(id) + '*',
        });

        return stream.forEach(async (keys) => {
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

        const schemaString = await v.get(keys.schema);
        if (schemaString === null) {
          throw new NotFoundError('id', id);
        }

        const schema = wwydQuizSchema.parse(JSON.parse(schemaString));
        const nextQuestionId = (await v.incr(keys.nextQuestion)) - 1;

        const stream = new VStream<StreamElement>(v, keys.stream);

        if (nextQuestionId >= schema.scenarios.length) {
          await stream.xadd({ type: 'done' });
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

        await stream.xadd({
          type: 'question',
          id: nextQuestionId,
          data: question,
        });
        return nextQuestionId;
      }),
  }),
});

export default quizRouter;
