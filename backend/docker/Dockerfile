FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS builder
WORKDIR /app
# Prisma's engine needs libssl to detect the right binary target at `generate` time — without
# it, it silently falls back to guessing (openssl-1.1.x) instead of matching what's actually on
# this Alpine base, which risks a query-engine mismatch at runtime.
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Same reasoning as the builder stage, but for the query engine binary actually running here.
RUN apk add --no-cache openssl

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

USER nestjs

EXPOSE 3001

# tsconfig.json has no rootDir/include restricting the build to src/ alone, so tsc infers the
# common root across src/, prisma/, tests/, etc. and nests output accordingly — the compiled
# entrypoint ends up at dist/src/main.js, not dist/main.js. Confirmed by inspecting the built
# image directly (`docker run --entrypoint sh ... find /app/dist -name main.js`) rather than
# assuming the conventional path, after this exact mismatch crashed the container with
# MODULE_NOT_FOUND on first boot.
CMD ["node", "dist/src/main.js"]
