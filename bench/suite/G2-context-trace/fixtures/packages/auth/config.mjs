// packages/auth/config.mjs — auth package configuration.
// TOKEN_TTL_SECONDS is the single source of truth for how long an issued session
// token stays valid. Every expiry/gating decision downstream derives from this one
// constant — change it HERE and nowhere else.
export const TOKEN_TTL_SECONDS = 900;
