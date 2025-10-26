# Stage 1: Builder
FROM node:20.11.1-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias para build
RUN npm ci

# Generar Prisma Client
RUN npx prisma generate

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20.11.1-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Instalar solo producción
RUN npm ci --only=production

# Generar Prisma Client para producción
RUN npx prisma generate

# Copiar desde el stage de builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
