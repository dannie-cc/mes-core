import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as Schema from './schema';

export type DrizzleClient = NodePgDatabase<typeof Schema>;
export type DrizzleTransaction = NodePgDatabase<typeof Schema>;
