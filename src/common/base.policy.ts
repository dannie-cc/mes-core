import { JwtUser } from '@/types/jwt.types';
import { ForbiddenException } from '@nestjs/common';
import { and, eq, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

export const TRUE: SQL = sql`1 = 1`;
export const FALSE: SQL = sql`1 = 0`;

// Always return SQL (normalize drizzle's union)
export function andAll(base: SQL, ...extra: SQL[]): SQL {
    if (extra.length === 0) return base;
    const out = and(base, ...extra) as SQL | undefined;
    return out ?? base;
}

// OR that always returns SQL
export function orAll(base: SQL, ...extra: SQL[]): SQL {
    if (extra.length === 0) return base;
    const out = or(base, ...extra) as SQL | undefined;
    return out ?? base;
}

/**
 * BasePolicy implements semantic RBAC hierarchy:
 * - <resource>.<action>.all   => unrestricted
 * - <resource>.<action>       => owner-only (uses owner() accessor)
 *
 * Extending points:
 * - Lightweight: override readExtra / updateExtra / deleteExtra / writeExtra to
 *   add permissions without rewriting base logic.
 * - Heavyweight: override readOverride / updateOverride / deleteOverride /
 *   writeOverride if you truly need custom behavior.
 */
export abstract class BasePolicy<TTable> {
    protected readonly table: TTable;
    protected readonly resource: string;
    protected readonly owner: (t: TTable) => AnyPgColumn;

    protected constructor(opts: { table: TTable; resource: string; owner: (t: TTable) => AnyPgColumn }) {
        this.table = opts.table;
        this.resource = opts.resource;
        this.owner = opts.owner;
    }

    protected hasAll(user: JwtUser, action: string): boolean {
        return user.permissions.includes(`${this.resource}.${action}.all`);
    }

    protected hasBase(user: JwtUser, action: string): boolean {
        return user.permissions.includes(`${this.resource}.${action}`);
    }

    // ---------- Lightweight additive hooks (optional to override) ----------

    // Return an extra SQL scope to OR with base read (e.g., tickets.read.quotation)
    protected async readExtra(_user: JwtUser): Promise<SQL | null> {
        return null;
    }

    // Return true to allow write even without base perms (e.g., special window)
    protected async writeExtra(_user: JwtUser): Promise<boolean> {
        return false;
    }

    // Return an extra SQL scope to OR with base update
    protected async updateExtra(_user: JwtUser): Promise<SQL | null> {
        return null;
    }

    // Return an extra SQL scope to OR with base delete
    protected async deleteExtra(_user: JwtUser): Promise<SQL | null> {
        return null;
    }

    // ---------- Heavyweight override hooks (same signature as public) ----------

    // If you override these, you fully control behavior (still may call helpers)
    protected async readOverride(user: JwtUser, ...extra: SQL[]): Promise<SQL> {
        // base semantics
        let base: SQL | null = null;
        if (this.hasAll(user, 'read')) base = TRUE;
        else if (this.hasBase(user, 'read')) base = eq(this.owner(this.table), user.id);

        // additive custom scope
        const custom = await this.readExtra(user);

        if (!base && !custom) {
            throw new ForbiddenException(`Cannot read ${this.resource}`);
        }

        const combined = base && custom ? orAll(base, custom) : (base ?? custom!);
        return andAll(combined, ...extra);
    }

    protected async writeOverride(_user: JwtUser): Promise<void> {
        // default no-op
    }

    protected async updateOverride(user: JwtUser, ...extra: SQL[]): Promise<SQL> {
        let base: SQL | null = null;
        if (this.hasAll(user, 'update')) base = TRUE;
        else if (this.hasBase(user, 'update')) base = eq(this.owner(this.table), user.id);

        const custom = await this.updateExtra(user);

        if (!base && !custom) {
            throw new ForbiddenException(`Cannot update ${this.resource}`);
        }

        const combined = base && custom ? orAll(base, custom) : (base ?? custom!);
        return andAll(combined, ...extra);
    }

    protected async deleteOverride(user: JwtUser, ...extra: SQL[]): Promise<SQL> {
        let base: SQL | null = null;
        if (this.hasAll(user, 'delete')) base = TRUE;
        else if (this.hasBase(user, 'delete')) base = eq(this.owner(this.table), user.id);

        const custom = await this.deleteExtra(user);

        if (!base && !custom) {
            throw new ForbiddenException(`Cannot delete ${this.resource}`);
        }

        const combined = base && custom ? orAll(base, custom) : (base ?? custom!);
        return andAll(combined, ...extra);
    }

    // ---------- Public API (unchanged signatures) ----------

    async read(user: JwtUser, ...extra: SQL[]): Promise<SQL> {
        return this.readOverride(user, ...extra);
    }

    async canWrite(user: JwtUser): Promise<void> {
        // 1) lightweight path
        if (await this.writeExtra(user)) return;

        // 2) heavy path (subclasses may throw here)
        await this.writeOverride(user);

        // 3) base semantics
        if (this.hasAll(user, 'write') || this.hasBase(user, 'write')) return;

        throw new ForbiddenException(`Cannot write ${this.resource}`);
    }

    async update(user: JwtUser, ...extra: SQL[]): Promise<SQL> {
        return this.updateOverride(user, ...extra);
    }

    async delete(user: JwtUser, ...extra: SQL[]): Promise<SQL> {
        return this.deleteOverride(user, ...extra);
    }
}
