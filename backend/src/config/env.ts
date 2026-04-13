import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL!,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET!,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET!,
  ACCESS_TOKEN_EXPIRES_IN: 15 * 60, // 900 segundos = 15 minutos
  REFRESH_TOKEN_EXPIRES_IN_DAYS: 7,
};
