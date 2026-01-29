import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { DrizzleService } from '@/models/model.service';
import { userAddress } from '@/models/schema/user-addresses.schema';
import { ListAddressQueryDto, AddressResponseDto, type CreateUserAddressDto, type UpdateUserAddressDto, updateDefaultAddressDto } from './user-addresses.dto';
import { Pagination } from '@/types/api-response.types';
import { validate as isUuid } from 'uuid';
@Injectable()
export class UserAddressesService {
    private db;
    constructor(private readonly drizzle: DrizzleService) {
        this.db = this.drizzle.database;
    }

    async list(userId: string, query: ListAddressQueryDto): Promise<{ data: AddressResponseDto[] } & Pagination> {
        const offset = (query.page - 1) * query.limit;
        const [rows, total] = await Promise.all([
            this.db
                .select()
                .from(userAddress)
                .where(eq(userAddress.userId, userId))
                .orderBy(desc(userAddress.isDefault), desc(userAddress.createdAt))
                .limit(query.limit)
                .offset(offset),
            this.db
                .select({ count: count() })
                .from(userAddress)
                .then((r) => r[0]?.count || 0),
        ]);
        return { data: rows, total: total, page: query.page, limit: query.limit };
    }

    async create(userId: string, data: CreateUserAddressDto) {
        if (data.isDefault) {
            await this.db.update(userAddress).set({ isDefault: false }).where(eq(userAddress.userId, userId));
        }
        const [row] = await this.db
            .insert(userAddress)
            .values({
                userId,
                ...data,
            })
            .returning();
        return row;
    }

    async findOne(id: string) {
        const address = await this.db.query.userAddress.findFirst({ where: eq(userAddress.id, id) });
        if (!address) {
            throw new NotFoundException('Address not found.');
        }

        return address;
    }

    async update(userId: string, addressId: string, data: UpdateUserAddressDto) {
        const [existing] = await this.db.select().from(userAddress).where(eq(userAddress.id, addressId)).limit(1);
        if (!existing || existing.userId !== userId) throw new NotFoundException('Address not found');
        if (data.isDefault) {
            await this.db
                .update(userAddress)
                .set({ isDefault: false })
                .where(and(eq(userAddress.userId, userId), eq(userAddress.isDefault, true)));
        }
        const [row] = await this.db
            .update(userAddress)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(userAddress.id, addressId))
            .returning();
        return row;
    }

    async setDefault(query: updateDefaultAddressDto) {
        if (!isUuid(query.addressId)) {
            throw new BadRequestException('Invalid address ID format (must be UUID)');
        }
        const [existing] = await this.db.select().from(userAddress).where(eq(userAddress.id, query.addressId)).limit(1);
        if (!existing || existing.userId !== query.userId) throw new NotFoundException('Address not found');
        await this.db.update(userAddress).set({ isDefault: false }).where(eq(userAddress.userId, query.userId));
        const [row] = await this.db.update(userAddress).set({ isDefault: true, updatedAt: new Date() }).where(eq(userAddress.id, query.addressId)).returning();
        return row;
    }

    async remove(userId: string, addressId: string) {
        const [existing] = await this.db.select().from(userAddress).where(eq(userAddress.id, addressId)).limit(1);
        if (!existing || existing.userId !== userId) throw new NotFoundException('Address not found');
        const [row] = await this.db.delete(userAddress).where(eq(userAddress.id, addressId)).returning();
        return row;
    }
}
