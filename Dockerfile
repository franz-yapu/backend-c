# 1️⃣ Build
FROM node:20.11.1-alpine AS build
WORKDIR /app

COPY package*.json ./

# El DNS del contenedor resuelve registry.npmjs.org a direcciones IPv6, pero la
# red de Docker no tiene salida IPv6: las conexiones que salen por ahí se quedan
# colgadas y el install muere con ETIMEDOUT. Se fuerza IPv4 y se dan reintentos
# para que el build no dependa de la suerte. (Solo afecta a esta etapa de build.)
ENV NODE_OPTIONS=--dns-result-order=ipv4first
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm install

COPY . .

# Generar cliente de Prisma
RUN npx prisma generate

# Build de NestJS
RUN npm run build

# 2️⃣ Producción
FROM node:20.11.1-alpine
WORKDIR /app

# Copiar dist, node_modules, prisma y package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
# tsconfig necesario para `prisma db seed` (ts-node prisma/seed.ts); sin él
# ts-node no toma module:commonjs y falla con "Cannot use import statement".
COPY --from=build /app/tsconfig*.json ./

# El .env NO se hornea en la imagen: las variables (JWT_SECRET, DATABASE_URL,
# credenciales de correo, etc.) se inyectan en runtime con `--env-file .env`
# o `environment:` en docker-compose. Así los secretos no quedan en las capas.

# Carpeta donde multer guarda y desde donde se sirven los archivos (/uploads/).
# En producción conviene montarla como volumen para que los archivos persistan.
RUN mkdir -p uploads

EXPOSE 3000

# El build de Nest emite dist/src/main.js (no dist/main.js).
CMD ["node", "dist/src/main.js"]