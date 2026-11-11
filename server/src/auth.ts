import { betterAuth } from 'better-auth'
import type { BetterAuthOptions } from 'better-auth'
import type { Config } from './config'

export function createAuth(config: Config, database: BetterAuthOptions['database']) {
  return betterAuth({
    appName: 'ntbk',
    database,
    baseURL: config.authUrl,
    secret: config.authSecret,
    trustedOrigins: config.origins,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      // Verificación y recuperación por correo se añadirán al configurar SMTP.
      requireEmailVerification: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: config.production,
      // La API sobrescribe esta cabecera con la dirección del socket de Bun.
      ipAddress: { ipAddressHeaders: ['x-ntbk-client-ip'] },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
