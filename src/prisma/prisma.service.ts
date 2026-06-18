import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Convierte recursivamente cualquier `Prisma.Decimal` a `number` en un resultado
 * de Prisma (objetos, arrays y resultados de agregación como `_sum`/`_avg`).
 *
 * Motivo: los campos de dinero ahora son `Decimal` en la BD (almacenamiento y
 * agregación EXACTOS en SQL). Pero `Prisma.Decimal` es un objeto: en JS,
 * `decimal + numero` concatena strings y, al serializar a JSON, sale como string,
 * lo que rompería el frontend. Convirtiendo a `number` en la capa de lectura, el
 * resto de la app (aritmética de display y respuestas HTTP/WS) sigue funcionando
 * sin cambios, mientras la exactitud crítica (storage, orden del ganador, SUM/AVG)
 * vive en la base de datos.
 */
export function deepDecimalToNumber(value: any): any {
  if (value === null || value === undefined) return value;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = deepDecimalToNumber(value[i]);
    return value;
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      value[key] = deepDecimalToNumber(value[key]);
    }
    return value;
  }
  return value;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      transactionOptions: {
        maxWait: 30000, // 20 segundos
        timeout: 30000, // 30 segundos
      },
      // Nunca exponer el hash de password en respuestas: se omite en TODA lectura
      // de User. Los dos sitios que sí lo necesitan (login y cambio de password)
      // lo reincluyen explícitamente con `omit: { password: false }`.
      omit: {
        user: { password: true },
      },
    });
  }

  async onModuleInit() {
    // Middleware global: toda lectura/escritura devuelve dinero como `number`.
    // Aplica también dentro de transacciones interactivas y a agregaciones.
    this.$use(async (params, next) => {
      const result = await next(params);
      return deepDecimalToNumber(result);
    });
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
