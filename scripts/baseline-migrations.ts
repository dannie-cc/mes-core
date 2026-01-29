#!/usr/bin/env tsx
/**
 * Baseline existing SQL migrations into drizzle_migrations table without re-running them.
 * Use when the database schema already matches the migration files but the drizzle_migrations table is empty/missing.
 *
 * Steps performed:
 * 1. Reads ./drizzle/*.sql migration files in lexical order.
 * 2. Computes SHA256 hash for each file (same algorithm drizzle uses).
 * 3. Creates drizzle_migrations table if it does not exist.
 * 4. Inserts a row per migration if a row with that hash is not already present.
 */
import 'dotenv/config';
import { readdirSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { Client } from 'pg';
import path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle');

function sha256(content: Buffer | string) {
    return createHash('sha256').update(content).digest('hex');
}

async function main() {
    const requiredEnv = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'];
    const missing = requiredEnv.filter((k) => !process.env[k]);
    if (missing.length) {
        console.error('Missing env vars (after loading .env):', missing.join(', '));
        process.exit(1);
    }

    const client = new Client({
        host: process.env.POSTGRES_HOST,
        port: parseInt(process.env.POSTGRES_PORT!, 10),
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
    });
    await client.connect();

    try {
        await client.query(`CREATE TABLE IF NOT EXISTS public.drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint NOT NULL);`);

        const files = readdirSync(MIGRATIONS_DIR)
            .filter((f) => /\.sql$/.test(f))
            .sort();

        if (!files.length) {
            console.error('No .sql migration files found in drizzle directory.');
            process.exit(1);
        }

        console.log('Found migration files (baseline order):');
        files.forEach((f) => console.log(' -', f));

        for (const f of files) {
            const full = path.join(MIGRATIONS_DIR, f);
            const hash = sha256(readFileSync(full));
            const exists = await client.query('SELECT 1 FROM public.drizzle_migrations WHERE hash = $1 LIMIT 1', [hash]);
            if (exists.rowCount) {
                console.log(`Skip (already present): ${f}`);
                continue;
            }
            await client.query('INSERT INTO public.drizzle_migrations (hash, created_at) VALUES ($1, $2)', [hash, Date.now()]);
            console.log(`Baseline inserted: ${f} (${hash.substring(0, 12)}...)`);
        }

        console.log('\nBaseline complete. Future migrations will apply normally.');
    } finally {
        await client.end();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
