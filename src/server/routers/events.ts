import { adminProcedure, publicProcedure, router } from '../trpc';
import schema from '../../protocol/schema';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { addMinutes, isAfter, isBefore } from 'date-fns';

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

export const eventRouter = router({
  create: adminProcedure.input(schema.event.create).mutation(async (opts) => {
    const {
      leagueId: id,
      startDate,
      endDate,
      submissionBufferMinutes,
    } = opts.input;
    const parent = await prisma.league.findUnique({ where: { id } });
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
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `startDate cannot be before league startDate ${parent.startDate.toISOString()}`,
      });
    }

    if (
      parent.endDate !== null &&
      (endDate === undefined || isAfter(endDate, parent.endDate))
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `endDate must be before league endDate ${parent.endDate.toISOString()}`,
      });
    }

    return prisma.event.create({
      data: {
        startDate,
        endDate,
        closingDate:
          computeClosingDate(endDate, submissionBufferMinutes) ?? null,
        parent: { connect: { id } },
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
      });
      return { events };
    }),
});
