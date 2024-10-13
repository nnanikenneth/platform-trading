import { registerAs } from "@nestjs/config";

export default registerAs("database", () => {
  const host = process.env.DATABASE_HOST || "localhost";
  const port = parseInt(process.env.DATABASE_PORT ?? "5432", 10);
  const username = process.env.DATABASE_USERNAME || "root";
  const password = process.env.DATABASE_PASSWORD || "password";
  const database = process.env.DATABASE_NAME || "testdb";

  const url =
    process.env.DATABASE_URL ||
    `postgres://${username}:${password}@${host}:${port}/${database}`;

  return {
    host,
    port,
    username,
    password,
    database,
    url,
  };
});
