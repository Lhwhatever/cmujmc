import { adminProcedure, publicProcedure, router } from '../trpc';
import schema from '../../protocol/schema';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { addMinutes, isAfter, isBefore } from 'date-fns';
import { AdminUserError } from '../../protocol/errors';
import { z } from 'zod';

const defaultSubmissionBufferMins = 30;

export const computeClosingDate = (endDate?: Date, bufferMins?: number) => {
  return (
    endDate && addMinutes(endDate, bufferMins ?? defaultSubmissionBufferMins)
  );
};

const leagueOrderBys = {
  'start-asc': { startDate: 'asc' } as Prisma.EventOrderByWithRelationInput,
  'start-desc': { startDate: 'desc' } as Prisma.EventOrderByWithRelationInput,
};

type CreateEvent = z.infer<typeof schema.event.create>;

const eventRouter = router({
  create: adminProcedure
    .input(schema.event.create)
    .mutation(async ({ input }) => {
      const {
        leagueId: id,
        startDate,
        endDate,
        submissionBufferMinutes,
        rulesetOverrideId,
      } = input;

      const parent = await prisma.league.findUnique({
        where: { id },
        select: { startDate: true, endDate: true, defaultRuleId: true },
      });

      if (parent === null) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No league with ID ${id}`,
        });
      }

      if (
        parent.startDate !== null &&
        (startDate === undefined || isBefore(startDate, parent.startDate))
      ) {
        throw new AdminUserError<CreateEvent>({
          field: 'startDate',
          message: `Cannot be before league startDate ${parent.startDate.toISOString()}`,
        });
      }

      if (
        parent.endDate !== null &&
        (endDate === undefined || isAfter(endDate, parent.endDate))
      ) {
        throw new AdminUserError<CreateEvent>({
          field: 'endDate',
          message: `Cannot be after league endDate ${parent.endDate.toISOString()}`,
        });
      }

      return prisma.event.create({
        data: {
          startDate,
          endDate,
          closingDate:
            computeClosingDate(endDate, submissionBufferMinutes) ?? null,
          parent: { connect: { id } },
          ruleset: {
            connect: { id: rulesetOverrideId ?? parent.defaultRuleId },
          },
        },
      });
    }),

  getByLeague: publicProcedure
    .input(schema.event.getByLeague)
    .query(async (opts) => {
      const { leagueId, limit, sortDirection, filters } = opts.input;

      const AND: Prisma.EventWhereInput[] = [{ parentId: leagueId }];
      filters?.forEach(({ lhs, op, rhs }) => {
        AND.push({ [lhs]: { [op]: rhs } });
      });

      const events = await prisma.event.findMany({
        where: { AND },
        orderBy: leagueOrderBys[sortDirection ?? 'start-asc'],
        take: limit,
        include: { ruleset: true },
      });
      return { events };
    }),

  list: publicProcedure.input(schema.event.list).query(async (opts) => {
    const { limit, sortDirection, filters } = opts.input;

    const events = await prisma.event.findMany({
      where: {
        AND: filters?.map(({ lhs, op, rhs }) => ({ [lhs]: { [op]: rhs } })),
      },
      orderBy: leagueOrderBys[sortDirection ?? 'start-asc'],
      take: limit,
      include: { parent: true },
    });

    return { events };
  }),
});

export default eventRouter;
