import { Param, Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesDecorators } from './roles.decorators';
import { ok, OkResponseBuilder } from '@/utils';
import { AssignRoleDto, CreateRoleDto, UpdateRoleDetailsDto, UpdateRolePermissionsDto } from './roles.dto';
import { PaginatedFilterQueryDto } from '@/common/dto/filter.dto';

@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Post('create')
    @RolesDecorators('create')
    async create(@Body() body: CreateRoleDto) {
        const newRole = await this.rolesService.create(body);

        return ok(newRole).message('Role created successfully.');
    }

    @Get('lookup')
    @RolesDecorators('lookup')
    async lookup() {
        const result = await this.rolesService.lookup();

        return ok(result).message('Roles fetched successfully');
    }

    @Get('list')
    @RolesDecorators('list')
    async list(@Query() query: PaginatedFilterQueryDto) {
        const result = await this.rolesService.list(query);

        return ok(result.data).message('Roles fetched successfully').paginate({
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }

    @Get(':roleId')
    @RolesDecorators('findOne')
    async findOne(@Param('roleId') roleId: string) {
        const result = await this.rolesService.findOneWithPermissions(roleId);

        return ok(result).message('Role fetched successfully!');
    }

    @Put('assign')
    @RolesDecorators('assign')
    async assign(@Body() body: AssignRoleDto) {
        const { userId, roleId } = body;

        const updatedUser = await this.rolesService.assignToUser(userId, roleId);

        return ok(updatedUser).message('Role assigned successfully.');
    }

    @Put('update-permissions/:roleId')
    @RolesDecorators('update-permissions')
    async updatePermissions(@Body() body: UpdateRolePermissionsDto, @Param('roleId') roleId: string): Promise<OkResponseBuilder<boolean>> {
        const { permissionIds } = body;

        await this.rolesService.updatePermissions(roleId, permissionIds);

        return ok(true).message('Permissions updated successfully.');
    }

    @Put('update-details/:roleId')
    @RolesDecorators('update-details')
    async updateDetails(@Body() body: UpdateRoleDetailsDto, @Param('roleId') roleId: string) {
        const updated = await this.rolesService.updateDetails(roleId, body);

        return ok(updated).message('Role detail updated successfully!');
    }
}
