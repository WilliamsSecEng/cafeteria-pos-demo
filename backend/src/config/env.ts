import "dotenv/config";

const requiredEnv = ["DATABASE_URL", "PORT", "CLIENT_URL", "JWT_SECRET"] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Falta la variable de entorno: ${key}`);
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL as string,
  PORT: Number(process.env.PORT),
  CLIENT_URL: process.env.CLIENT_URL as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
};