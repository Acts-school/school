############################
# 1) Install dependencies  #
############################
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

############################
# 2) Build application     #
############################
FROM node:18-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

############################
# 3) Production runtime    #
############################
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Create non-root user
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copy required assets
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
USER nextjs

# Run migrations and start Next.js
CMD ["sh", "-c", "npx prisma migrate deploy && node node_modules/next/dist/bin/next start -p 3000"]
