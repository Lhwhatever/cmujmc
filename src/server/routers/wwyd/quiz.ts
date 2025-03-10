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
import wwydQuizSchema, {
  wwydScenarioWithSettingSchema,
} from '../../../utils/wwyd/basicSchema';
import schema from '../../../protocol/schema';
import { zAsyncIterable } from '../../../protocol/zAsyncIterable';
import { TRPCError } from '@trpc/server';
import superjson from 'superjson';
import Valkey from 'iovalkey';
import { serializeResponse } from '../../../utils/wwyd/response';

const makePrefix = (id: number | string) => `wwyd:${id}:`;
const valkey = makeValkey(makePrefix);

const keys = {
  name: 'name',
  schema: 'schema',
  currQuestion: 'currQuestion',
  stream: 'stream',
  players: 'players',
  answers: 'answers',
  timeLimit: 'timeLimit',
};

const keyRegex = /^wwyd:(\d+):.*$/;

const extractId = (key: string) => {
  const matchArray = keyRegex.exec(key);
  if (matchArray === null) throw `Bad key ${key}`;
  return parseInt(matchArray[1]);
};

type StreamElement = z.infer<typeof schema.wwyd.quiz.playOutput>;
type StoredScenario = z.infer<typeof wwydScenarioWithSettingSchema>;

class WwydQuizState {
  readonly quizId: number;
  readonly v: Valkey;
  readonly stream: VStream<StreamElement>;

  static async list(): Promise<[number, string][]> {
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
  }

  static async delete(quizId: number): Promise<void> {
    const v = valkey();

    const stream = v.scanStream({
      match: makePrefix(quizId) + '*',
    });

    return stream.forEach(async (keys) => {
      if (keys.length === 0) return;
      await v.del(...keys);
    });
  }

  static async restart(quizId: number): Promise<boolean> {
    const v = valkey();
    return (
      (await v.call(
        'SET',
        makePrefix(quizId) + keys.currQuestion,
        -1,
        'XX',
      )) !== null
    );
  }

  constructor(quizId: number) {
    this.quizId = quizId;
    this.v = valkey(quizId);
    this.stream = new VStream(this.v, keys.stream);
  }

  async countParticipants(): Promise<number> {
    return this.v.hlen(keys.players);
  }

  async setup(name: string, scenarios: StoredScenario[]): Promise<boolean> {
    if (!(await this.v.setnx(keys.currQuestion, -1))) return false;
    await this.v.set(keys.name, name);
    await this.v.rpush(
      keys.schema,
      ...scenarios.map((s) => superjson.stringify(s)),
    );
    return true;
  }

  async getCurrQuestionIdx(): Promise<number | null> {
    const currIdx = await this.v.get(keys.currQuestion);
    if (currIdx === null) return null;
    return parseInt(currIdx);
  }

  async incrementQuestion(): Promise<number> {
    return this.v.incr(keys.currQuestion);
  }

  async getQuestion(questionIdx: number): Promise<StoredScenario | null> {
    const result = await this.v.lindex(keys.schema, questionIdx);
    if (result === null) return null;
    return wwydScenarioWithSettingSchema.parse(superjson.parse(result));
  }

  async setTimeLimit(unixTime: number): Promise<void> {
    await this.v.set(keys.timeLimit, unixTime);
  }

  async clearAnswers(): Promise<void> {
    await this.v.del(keys.answers);
  }

  async broadcast(event: StreamElement): Promise<void> {
    await this.stream.xadd(event);
  }

  async registerPlayer(userId: string, name?: string | null): Promise<void> {
    await this.v.hset(keys.players, userId, name ?? 'Anonymous');
  }

  async deregisterPlayer(userId: string): Promise<void> {
    await this.v.hdel(keys.players, userId);
  }

  async getCurrQuestionState(): Promise<{
    questionId: number;
    timeLimit: number;
  } | null> {
    const [currQuestionStr, timeLimitStr] = await this.v.mget(
      keys.currQuestion,
      keys.timeLimit,
    );

    if (currQuestionStr === null || timeLimitStr === null) return null;
    return {
      questionId: parseInt(currQuestionStr),
      timeLimit: parseInt(timeLimitStr),
    };
  }

  async recordAnswer(
    userId: string,
    serializedResponse: string,
  ): Promise<boolean> {
    return (
      (await this.v.hsetnx(keys.answers, userId, serializedResponse)) === 1
    );
  }

  async summarizeResponses(): Promise<Record<string, number>> {
    const statistics: Record<string, number> = {};
    for (const response of await this.v.hvals(keys.answers)) {
      statistics[response] = 1 + (statistics[response] ?? 0);
    }
    return statistics;
  }
}

const quizRouter = router({
  list: publicProcedure.query(WwydQuizState.list),

  play: authedProcedure
    .input(z.number())
    .output(zAsyncIterable({ yield: schema.wwyd.quiz.playOutput }))
    .subscription(async function* ({ input: quizId, ctx }) {
      const state = new WwydQuizState(quizId);
      let nextMsgId = '0';

      if ((await state.getCurrQuestionIdx()) == null) {
        throw new NotFoundError('wwyd.quiz.play', quizId);
      }

      try {
        await state.registerPlayer(ctx.user.id, ctx.user.name);

        while (true) {
          const results = await state.stream.xread(nextMsgId, {
            blockMs: 300000,
            retries: 5,
          });

          if (results === null) {
            throw new Error(
              `Too many retries: play subscription ${quizId}, user: ${ctx.user.name}`,
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
        state.deregisterPlayer(ctx.user.id);
      }
      return;
    }),

  submit: authedProcedure
    .input(schema.wwyd.quiz.submit)
    .mutation(async ({ input, ctx }) => {
      const submitTime = Date.now();
      const { quizId, questionId: submissionQuestionId, answer } = input;

      const state = new WwydQuizState(quizId);

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

      if (!(await state.recordAnswer(ctx.user.id, serializeResponse(answer)))) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Already submitted an answer',
        });
      }
    }),

  countParticipants: authedProcedure
    .input(z.number())
    .query(({ input: id }) => new WwydQuizState(id).countParticipants()),

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

        if (!(await new WwydQuizState(id).setup(name, scenarios))) {
          throw new AdminUserError<{ id: number }>({
            field: 'id',
            message: `WWYD ${id} (name "${name}") is already live! `,
          });
        }
      }),

    delete: adminProcedure
      .input(z.number().int())
      .mutation(async ({ input: id }) => WwydQuizState.delete(id)),

    restart: adminProcedure
      .input(z.number().int())
      .mutation(async ({ input: id }) => WwydQuizState.restart(id)),

    nextQuestion: adminProcedure
      .input(z.number().int())
      .mutation(async ({ input: id }) => {
        const state = new WwydQuizState(id);
        if ((await state.getCurrQuestionIdx()) == null) {
          throw new NotFoundError('id', id);
        }

        const currQuestionIdx = await state.incrementQuestion();
        const question = await state.getQuestion(currQuestionIdx);

        if (question === null) {
          state.broadcast({ type: 'done' });
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
      }),

    revealResponses: adminProcedure
      .input(z.number().int())
      .mutation(async ({ input: quizId }) => {
        const state = new WwydQuizState(quizId);
        const currState = await state.getCurrQuestionState();
        if (currState === null) {
          throw new NotFoundError('id', quizId);
        }

        const { questionId, timeLimit } = currState;
        const question = await state.getQuestion(questionId);
        if (question === null) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Game has ended!',
          });
        }

        if (Date.now() <= timeLimit) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'There is still time left!',
          });
        }

        const responses = await state.summarizeResponses();
        // TODO: validate poll responses

        await state.stream.xadd({
          type: 'data',
          id: questionId,
          subject: 'Poll',
          data: responses,
        });
      }),
  }),
});

export default quizRouter;
