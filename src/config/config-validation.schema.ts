import * as Joi from "joi";

export const validationSchema = Joi.object({
  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgres", "mysql"] })
    .required()
    .messages({
      "string.uri":
        "DATABASE_URL must be a valid URI string starting with 'postgres' or 'mysql'.",
      "any.required": "DATABASE_URL is required in the environment variables.",
    }),
  REDIS_HOST: Joi.string().hostname().default("localhost").messages({
    "string.hostname": "REDIS_HOST must be a valid hostname.",
  }),
  REDIS_PORT: Joi.number().port().default(6379).messages({
    "number.port": "REDIS_PORT must be a valid port number.",
  }),
  REDIS_PASSWORD: Joi.string().allow("", null).optional().messages({
    "string.base": "REDIS_PASSWORD must be a string.",
  }),
  JWT_SECRET: Joi.string().min(8).required().messages({
    "string.min": "JWT_SECRET must be at least 8 characters long.",
    "any.required": "JWT_SECRET is required for token signing.",
  }),
  JWT_EXPIRATION: Joi.number().positive().required().messages({
    "number.base": "JWT_EXPIRATION must be a number representing seconds.",
    "any.required": "JWT_EXPIRATION is required to set token expiry.",
  }),
  APP_PORT: Joi.number().port().default(3000).messages({
    "number.port": "APP_PORT must be a valid port number.",
  }),
  CORS_ENABLED: Joi.boolean().default(true).messages({
    "boolean.base": "CORS_ENABLED must be a boolean value.",
  }),
  CORS_ORIGIN: Joi.string().default("*").messages({
    "string.base": "CORS_ORIGIN must be a valid string.",
  }),
  LOG_LEVEL: Joi.string()
    .valid("info", "debug", "warn", "error")
    .default("info")
    .messages({
      "string.valid":
        'LOG_LEVEL must be one of "info", "debug", "warn", or "error".',
    }),
  API_VERSION: Joi.string().default("v1").messages({
    "string.base": "API_VERSION must be a valid string.",
  }),
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development")
    .messages({
      "string.valid":
        'NODE_ENV must be one of "development", "production", or "test".',
    }),
  PRISMA_LOGGING: Joi.boolean().default(true).messages({
    "boolean.base": "PRISMA_LOGGING must be a boolean value.",
  }),
  COOKIE_SECRET: Joi.string().min(32).required().messages({
    "string.min": "COOKIE_SECRET must be at least 32 characters long.",
    "any.required": "COOKIE_SECRET is required for cookie signing.",
  }),
});
