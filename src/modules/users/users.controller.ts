import { Body, Controller, ForbiddenException, Get, Param, Put, Query } from '@nestjs/common';
import { UsersService } from './users.service';

import { UpdateUserProfileDto } from './users.dto';
import { ok } from '@/utils';
import { Pagination } from '@/types';
import { UsersDecorators } from './users.decorators';
import { PaginatedFilterQueryDto } from '@/common/dto/filter.dto';
import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { JwtUser } from '@/types/jwt.types';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly logger: CustomLoggerService,
    ) {
        this.logger.setContext(UsersController.name);
    }

    @Get('list')
    @UsersDecorators('list')
    async list(@Query() filterQuery: PaginatedFilterQueryDto, @CurrentUser() user: JwtUser) {
        const result = await this.usersService.list(filterQuery, user);
        const paginationDetails: Pagination = {
            total: result.total,
            page: result.page,
            limit: result.limit,
        };
        return ok(result.data).message('Users fetched successfully').paginate(paginationDetails);
    }

    @Get('profile')
    @UsersDecorators('profileSelf')
    async getCurrentUser(@CurrentUser() currentUser: JwtUser) {
        const user = await this.usersService.findOne(currentUser.id);
        return ok(user).message('User details fetched successfully.');
    }
    //
    @Get(':userId')
    @UsersDecorators('findOne')
    async findOne(@Param('userId') userId: string, @CurrentUser() reqUser: JwtUser) {
        if (userId !== reqUser.id && !reqUser.permissions.includes('users.read.all')) {
            throw new ForbiddenException('You can only view your own profile');
        }
        const user = await this.usersService.findOne(userId, reqUser);
        return ok(user).message('User profile fetched successfully');
    }

    @Put('profile/:userId')
    @UsersDecorators('updateProfile')
    async updateProfile(@Param('userId') userId: string, @Body() userData: UpdateUserProfileDto, @CurrentUser() currentUser: JwtUser) {
        if (userId !== currentUser.id && !currentUser.permissions.includes('users.update.all')) {
            throw new ForbiddenException('You can only update your own profile');
        }
        const user = await this.usersService.updateProfile(userId, userData, currentUser);
        return ok(user).message('Your profile has been updated successfully');
    }
}
