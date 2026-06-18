# 1️⃣ Build
FROM node:20.11.1-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install
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

# El .env NO se hornea en la imagen: las variables (JWT_SECRET, DATABASE_URL,
# credenciales de correo, etc.) se inyectan en runtime con `--env-file .env`
# o `environment:` en docker-compose. Así los secretos no quedan en las capas.

EXPOSE 3000

# Ajustar path a main.js compilado
CMD ["node", "dist/main.js"]