# Multi-stage Dockerfile for ForgeOps (Next.js demo/prod self-host)
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DEMO_MODE=true
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
