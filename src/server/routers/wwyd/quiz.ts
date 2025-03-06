import { adminProcedure, publicProcedure, router } from '../../trpc';
import schema from '../../../protocol/schema';
import valkey, { newValkeyInstance } from '../../cache/valkey';
import { prisma } from '../../prisma';
import { id } from 'date-fns/locale';
import { AdminUserError } from '../../../protocol/errors';

const listKey = 'wwyd.quiz.list';
const idKey = (id: number) => `wwyd.quiz.${id}`;

const quizRouter = router({
  host: adminProcedure
    .input(schema.wwyd.quiz.host)
    .mutation(async ({ input: id }) => {
      const { name, schema } = await prisma.wwyd.findUniqueOrThrow({
        where: { id },
        select: {
          name: true,
          schema: true,
        },
      });

      if (!(await valkey.hsetnx(listKey, String(id), name))) {
        throw new AdminUserError<{ id: number }>({
          field: 'id',
          message: `WWYD ${id} (name "${name}") is already live! `,
        });
      }

      await valkey.set(`${idKey(id)}.schema`, JSON.stringify(schema));
    }),

  delete: adminProcedure
    .input(schema.wwyd.quiz.delete_)
    .mutation(async ({ input: id }) => {
      if (!(await valkey.hdel(listKey, String(id)))) {
        throw new AdminUserError<{ id: number }>({
          field: 'id',
          message: `WWYD ${id} is not live!`,
        });
      }
    }),

  list: publicProcedure.query(async () => {
    const result = await valkey.hgetall(listKey);
    return Object.entries(result).map(
      ([id, name]) => [parseInt(id), name] as [number, string],
    );
  }),
});

export default quizRouter;
