# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
LABEL authors="lh"

RUN npm i -g corepack@latest

# Install dependencies only when needed
FROM base AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY prisma ./prisma/

ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x"

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN --mount=type=secret,id=env,target=./.env \
    corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm

ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x"

RUN --mount=type=secret,id=env,target=./.env \
    pnpm run build

FROM base AS runner
WORKDIR /app

COPY --from=builder /app .

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown nextjs:nodejs .next
RUN corepack enable pnpm
COPY azure .env

USER nextjs

ENV PORT=3000
EXPOSE 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["pnpm", "run", "start"]