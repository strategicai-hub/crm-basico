import { env } from './config/env';
import app from './app';

const REQUIRED_ENVS = [
  'DATABASE_URL',
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_DRIVE_FOLDER_ID',
] as const;

const missing = REQUIRED_ENVS.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  console.warn(
    `[boot.env_missing] Variáveis de ambiente ausentes ou vazias: ${missing.join(', ')}. ` +
      `Funcionalidades dependentes podem falhar (uploads do Drive exigem GOOGLE_SERVICE_ACCOUNT_JSON e GOOGLE_DRIVE_FOLDER_ID).`,
  );
} else {
  console.log(`[boot.env_ok] ${REQUIRED_ENVS.length} variáveis obrigatórias presentes.`);
}

app.listen(env.PORT, () => {
  console.log(`CRM Backend rodando na porta ${env.PORT}`);
});
