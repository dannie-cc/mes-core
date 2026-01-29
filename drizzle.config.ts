import { makeDrizzleConfigs } from '@/config';
import 'dotenv/config';

export default {
    schema: './src/models/schema/**/*.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: makeDrizzleConfigs(),
    migrations: {
        table: 'drizzle_migrations',
        schema: 'public', // used in PostgreSQL only, `drizzle` by default
    },
    verbose: true,
    strict: true,
};
