import {
  adminProcedure,
  authedProcedure,
  publicProcedure,
  router,
} from '../../trpc';
import { prisma } from '../../prisma';
import { AdminUserError, NotFoundError } from '../../../protocol/errors';
import { z } from 'zod';
import wwydQuizSchema, {
  wwydScenarioWithSettingSchema,
} from '../../../utils/wwyd/basicSchema';
import schema from '../../../protocol/schema';
import { zAsyncIterable } from '../../../protocol/zAsyncIterable';
import { TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { serializeResponse } from '../../../utils/wwyd/response';
import {
  createCacheClient,
  inferKeyMap,
  makeKeyMap,
  VStream,
  withCache,
} from '../../cache/glide';
import {
  ClusterScanCursor,
  GlideClusterClient,
  GlideString,
  ObjectType,
} from '@valkey/valkey-glide';

const keymap = makeKeyMap(['wwyd'], {
  name: 'name',
  schema: 'schema',
  currQuestion: 'currQuestion',
  stream: 'stream',
  players: 'players',
  answers: 'answers',
  timeLimit: 'timeLimit',
  all: '*',
});

const keyRegex = /^{wwyd:(\d+)}:.*$/;

const extractId = (key: string) => {
  const matchArray = keyRegex.exec(key);
  if (matchArray === null) throw `Bad key ${key}`;
  return parseInt(matchArray[1]);
};

type StreamElement = z.infer<typeof schema.wwyd.quiz.playOutput>;
type StoredScenario = z.infer<typeof wwydScenarioWithSettingSchema>;

class WwydQuizState {
  readonly cache: GlideClusterClient;
  readonly k: inferKeyMap<typeof keymap>;
  readonly stream: VStream<StreamElement>;

  static async list(cache: GlideClusterClient): Promise<[number, string][]> {
    const match = keymap('*').name;

    let cursor = new ClusterScanCursor();
    const results: [number, string][] = [];
    while (!cursor.isFinished()) {
      const [nextCursor, keys] = await cache.scan(cursor, {
        match,
        type: ObjectType.STRING,
      });
      cursor = nextCursor;

      if (keys.length === 0) continue;
      const names = await cache.mget(keys);

      for (let i = 0; i < keys.length; ++i) {
        const name = names[i];
        if (name !== null) {
          results.push([extractId(keys[i] as string), name as string]);
        }
      }
    }

    return results;
  }

  static async delete(
    cache: GlideClusterClient,
    quizId: number,
  ): Promise<void> {
    const match = keymap(quizId).all;

    let cursor = new ClusterScanCursor();
    const matchedKeys: GlideString[] = [];
    while (!cursor.isFinished()) {
      const [nextCursor, keys] = await cache.scan(cursor, { match });
      cursor = nextCursor;
      matchedKeys.push(...keys);
    }

    await cache.del(matchedKeys);
  }

  constructor(quizId: number, cacheClient: GlideClusterClient) {
    this.cache = cacheClient;
    this.k = keymap(quizId);
    this.stream = new VStream(this.cache, this.k.stream);
  }

  async restart(): Promise<boolean> {
    const result = await this.cache.set(this.k.currQuestion, '-1', {
      conditionalSet: 'onlyIfExists',
    });
    return result !== null;
  }

  async countParticipants(): Promise<number> {
    return this.cache.hlen(this.k.players);
  }

  async countResponses(): Promise<number> {
    return this.cache.hlen(this.k.answers);
  }

  async setup(name: string, scenarios: StoredScenario[]): Promise<boolean> {
    const setResult = await this.cache.set(this.k.currQuestion, '-1', {
      conditionalSet: 'onlyIfDoesNotExist',
    });
    if (setResult === null) return false;

    await this.cache.set(this.k.name, name);
    await this.cache.rpush(
      this.k.schema,
      scenarios.map((s) => superjson.stringify(s)),
    );
    await this.broadcast({ type: 'start' });
    return true;
  }

  async getCurrQuestionIdx(): Promise<number | null> {
    const currIdx = await this.cache.get(this.k.currQuestion);
    if (currIdx === null) return null;
    return parseInt(currIdx as string);
  }

  async incrementQuestion(): Promise<number> {
    return this.cache.incr(this.k.currQuestion);
  }

  async getQuestion(questionIdx: number): Promise<StoredScenario | null> {
    const result = await this.cache.lindex(this.k.schema, questionIdx);
    if (result === null) return null;
    return wwydScenarioWithSettingSchema.parse(
      superjson.parse(result as string),
    );
  }

  async setTimeLimit(unixTime: number): Promise<void> {
    await this.cache.set(this.k.timeLimit, unixTime.toString());
  }

  async clearAnswers(): Promise<void> {
    await this.cache.del([this.k.answers]);
  }

  async registerPlayer(userId: string, name?: string | null): Promise<void> {
    await this.cache.hset(this.k.players, { [userId]: name ?? 'Anonymous' });
  }

  async deregisterPlayer(userId: string): Promise<void> {
    await this.cache.hdel(this.k.players, [userId]);
  }

  async getCurrQuestionState(): Promise<{
    questionId: number;
    timeLimit: number;
  } | null> {
    const [currQuestionStr, timeLimitStr] = await this.cache.mget([
      this.k.currQuestion,
      this.k.timeLimit,
    ]);

    if (currQuestionStr === null || timeLimitStr === null) return null;
    return {
      questionId: parseInt(currQuestionStr as string),
      timeLimit: parseInt(timeLimitStr as string),
    };
  }

  async recordAnswer(
    userId: string,
    serializedResponse: string,
  ): Promise<boolean> {
    return this.cache.hsetnx(this.k.answers, userId, serializedResponse);
  }

  async broadcast(event: StreamElement): Promise<void> {
    await this.stream.xadd(event);
  }

  async summarizeResponses(): Promise<Map<string, number>> {
    const statistics = new Map<string, number>();
    for (const response of await this.cache.hvals(this.k.answers)) {
      const answer = response as string;
      statistics.set(answer, 1 + (statistics.get(answer) ?? 0));
    }
    return statistics;
  }

  async readStream(
    msgIdFrom: string,
  ): Promise<
    null | 'done' | { nextIdFrom: string; entries: [string, StreamElement][] }
  > {
    const entries = await this.stream.xread(msgIdFrom);
    if (entries === null) return null;
    if (entries.length === 0) return { nextIdFrom: msgIdFrom, entries: [] };

    const [nextIdFrom, lastEntry] = entries[entries.length - 1];
    if (lastEntry.type === 'done') return 'done';

    const lastQuestionIdx = Math.max(
      0,
      entries.findLastIndex(([_, data]) => data.type === 'question'),
    );

    return { nextIdFrom, entries: entries.slice(lastQuestionIdx) };
  }
}

const quizRouter = router({
  list: publicProcedure.query(() => withCache(WwydQuizState.list)),

  play: authedProcedure
    .input(z.number())
    .output(zAsyncIterable({ yield: schema.wwyd.quiz.playOutput }))
    .subscription(async function* ({ input: quizId, ctx }) {
      const client = await createCacheClient();
      try {
        const state = new WwydQuizState(quizId, client);
        let nextMsgId = '0';

        if ((await state.getCurrQuestionIdx()) == null) {
          throw new NotFoundError('wwyd.quiz.play', quizId);
        }

        try {
          await state.registerPlayer(ctx.user.id, ctx.user.name);

          while (true) {
            const result = await state.readStream(nextMsgId);
            if (result === null) {
              throw 'Error reading stream';
            }

            if (result === 'done') break;
            const { nextIdFrom, entries } = result;
            nextMsgId = nextIdFrom;

            for (const [_, entry] of entries) {
              yield entry;
            }
          }
          yield { type: 'done' };
        } catch (e) {
          console.error('Error in play', e);
          throw e;
        } finally {
          await state.deregisterPlayer(ctx.user.id);
        }
      } finally {
        client.close();
      }
    }),

  submit: authedProcedure
    .input(schema.wwyd.quiz.submit)
    .mutation(async ({ input, ctx }) => {
      const submitTime = Date.now();
      const { quizId, questionId: submissionQuestionId, answer } = input;

      const cache = await createCacheClient();
      try {
        const state = new WwydQuizState(quizId, cache);
        const currQuestionState = await state.getCurrQuestionState();
        if (currQuestionState === null) {
          throw new NotFoundError('wwyd.quiz.submit', quizId);
        }
        const { questionId, timeLimit } = currQuestionState;
        if (questionId < 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Game has not started yet!',
          });
        }

        if (submissionQuestionId !== questionId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Expected questionId to be ${questionId}, received ${submissionQuestionId}`,
          });
        }

        if (submitTime > timeLimit) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Answering period has ended',
          });
        }

        if (
          !(await state.recordAnswer(ctx.user.id, serializeResponse(answer)))
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Already submitted an answer',
          });
        }
      } finally {
        cache.close();
      }
    }),

  countParticipants: authedProcedure
    .input(z.number())
    .query(async ({ input: id }) =>
      withCache((cache) => new WwydQuizState(id, cache).countParticipants()),
    ),

  countResponses: authedProcedure
    .input(z.number())
    .query(async ({ input: id }) =>
      withCache((cache) => new WwydQuizState(id, cache).countResponses()),
    ),

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

        const { scenarios } = wwydQuizSchema.parse(schema);
        const cache = await createCacheClient();
        try {
          const state = new WwydQuizState(id, cache);
          if (!(await state.setup(name, scenarios))) {
            throw new AdminUserError<{ id: number }>({
              field: 'id',
              message: `WWYD ${id} (name "${name}") is already live! `,
            });
          }
        } finally {
          cache.close();
        }
      }),

    delete: adminProcedure
      .input(z.number().int())
      .mutation(async ({ input: id }) =>
        withCache((cache) => WwydQuizState.delete(cache, id)),
      ),

    restart: adminProcedure
      .input(z.number().int())
      .mutation(async ({ input: id }) =>
        withCache((cache) => new WwydQuizState(id, cache).restart()),
      ),

    nextQuestion: adminProcedure
      .input(z.number().int())
      .mutation(async ({ input: id }) => {
        const cache = await createCacheClient();
        try {
          const state = new WwydQuizState(id, cache);
          if ((await state.getCurrQuestionIdx()) == null) {
            throw new NotFoundError('id', id);
          }

          const currQuestionIdx = await state.incrementQuestion();
          const question = await state.getQuestion(currQuestionIdx);

          if (question === null) {
            await state.broadcast({ type: 'done' });
            return null;
          }

          const {
            scenario,
            schema: schemaName,
            version,
            settings: schemaSettings,
          } = question;

          const endDate = Date.now() + (schemaSettings.timeLimit + 1) * 1000;
          await state.setTimeLimit(endDate);
          await state.clearAnswers();

          await state.broadcast({
            type: 'question',
            id: currQuestionIdx,
            data: {
              scenario,
              schema: schemaName,
              version,
              settings: { endDate },
            },
          });

          return currQuestionIdx;
        } finally {
          cache.close();
        }
      }),

    revealResponses: adminProcedure
      .input(z.number().int())
      .mutation(async ({ input: quizId }) => {
        const cache = await createCacheClient();
        try {
          const state = new WwydQuizState(quizId, cache);
          const currState = await state.getCurrQuestionState();
          if (currState === null) {
            throw new NotFoundError('id', quizId);
          }

          const { questionId } = currState;
          const question = await state.getQuestion(questionId);
          if (question === null) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Game has ended!',
            });
          }

          await state.setTimeLimit(Date.now());
          const responsesMap = await state.summarizeResponses();
          const data: Record<string, number> = {};
          for (const [response, count] of responsesMap.entries()) {
            data[response] = count;
          }

          // TODO: validate poll responses

          await state.stream.xadd({
            type: 'data',
            id: questionId,
            subject: 'Poll',
            data,
          });
        } finally {
          cache.close();
        }
      }),
  }),
});

export default quizRouter;
