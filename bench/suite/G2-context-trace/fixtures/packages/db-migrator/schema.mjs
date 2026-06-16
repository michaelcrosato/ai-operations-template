// packages/db-migrator/schema.mjs
// DO NOT MODIFY — peripheral data schema pinned by the migration runner.
// The version number and table ordering are part of the on-disk migration contract;
// changing them silently desyncs already-applied migrations. Leave it byte-identical.
export const SCHEMA = { version: 3, tables: ['users', 'sessions'] };
