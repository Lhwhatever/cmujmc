import { adminProcedure, router } from '../../trpc';
import { prisma } from '../../prisma';
import schema from '../../../protocol/schema';

const templateRouter = router({
  get: adminProcedure
    .input(schema.wwyd.template.get)
    .query(async ({ input: id }) =>
      prisma.wwyd.findUniqueOrThrow({ where: { id } }),
    ),

  list: adminProcedure
    .input(schema.wwyd.template.list)
    .query(async ({ input }) => {
      const [count, templates] = await prisma.$transaction([
        prisma.wwyd.count(),
        prisma.wwyd.findMany({
          select: {
            id: true,
            name: true,
            created: true,
            updated: true,
          },
          skip: input?.skip ?? 0,
          take: input?.limit ?? 50,
          orderBy: { updated: 'desc' },
        }),
      ]);

      return {
        count,
        templates,
      };
    }),

  create: adminProcedure.mutation(async () =>
    prisma.wwyd.create({
      select: { id: true },
      data: { name: '', schema: {} },
    }),
  ),

  edit: adminProcedure
    .input(schema.wwyd.template.edit)
    .mutation(async ({ input }) => {
      const { id, data } = input;
      await prisma.wwyd.update({
        where: { id },
        data: {
          name: data.name,
          schema: JSON.parse(data.schema),
          updated: new Date(),
        },
      });
    }),
});

export default templateRouter;
