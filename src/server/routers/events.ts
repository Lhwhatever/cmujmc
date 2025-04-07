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

  edit: adminProcedure.input(schema.event.edit).mutation(async ({ input }) => {
    const { eventId: id, startDate, endDate, closingDate } = input;
    await prisma.$transaction(async (txn) => {
      const event = await txn.event.findUniqueOrThrow({
        where: { id },
        select: {
          startDate: true,
          endDate: true,
          closingDate: true,
        },
      });

      const newStart = startDate !== undefined ? startDate : event.startDate;
      const newEnd = endDate !== undefined ? endDate : event.endDate;
      const newClosing =
        closingDate !== undefined ? closingDate : event.closingDate;

      if (newEnd !== null) {
        const newStartNum = newStart?.getTime() ?? Number.NEGATIVE_INFINITY;
        const newEndNum = newEnd.getTime();
        const newClosingNum = newClosing?.getTime() ?? Number.POSITIVE_INFINITY;
        if (!(newStartNum < newEndNum && newEndNum <= newClosingNum)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Required: startDate < endDate <= closingDate',
          });
        }
      } else {
        const newStartNum = newStart?.getTime() ?? Number.NEGATIVE_INFINITY;
        const newClosingNum = newClosing?.getTime() ?? Number.POSITIVE_INFINITY;
        if (!(newStartNum < newClosingNum)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Required: startDate < closingDate',
          });
        }
      }

      const filterStart: Prisma.MatchWhereInput | undefined =
        newStart !== null
          ? {
              time: {
                lt: newStart,
              },
            }
          : undefined;

      const filterClose: Prisma.MatchWhereInput | undefined =
        newClosing !== null
          ? {
              time: {
                gt: newClosing,
              },
            }
          : undefined;

      const badMatches = await txn.match.count({
        where: {
          eventId: id,
          ...(filterStart
            ? filterClose
              ? { OR: [filterStart, filterClose] }
              : filterStart
            : filterClose ?? {}),
        },
      });

      if (badMatches > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'There are some matches that fall outside of [startDate, closingDate]',
        });
      }

      await txn.event.update({
        where: { id },
        data: {
          startDate: newStart,
          endDate: newEnd,
          closingDate: newClosing,
        },
      });
    });
  }),

  deleteEvent: adminProcedure
    .input(z.number())
    .mutation(async ({ input: id }) => {
      await prisma.$transaction(async (txn) => {
        const event = await txn.event.findUniqueOrThrow({
          where: { id },
          select: { _count: { select: { matches: true } } },
        });

        if (event._count.matches > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot delete event ${id} with nonzero matches`,
          });
        }

        await txn.event.deleteMany({
          where: { id },
          limit: 1,
        });
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
