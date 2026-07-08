# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install build dependencies and generate Prisma Client
RUN npm ci
RUN npx prisma generate

# Stage 2: Production Runner
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy generated Prisma Client and node modules from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy application source and prisma configurations
COPY prisma ./prisma/
COPY src ./src/

EXPOSE 5001

ENV PORT=5001
ENV NODE_ENV=production

CMD ["npm", "start"]
