import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PickupAddressesService } from './pickup-addresses.service';
import { CreatePickupAddressDto, UpdatePickupAddressDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role, User } from '@prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('pickup-addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.PRODUCTOR)
export class PickupAddressesController {
  constructor(
    private readonly pickupAddressesService: PickupAddressesService,
  ) {}

  @Post()
  create(@Body() createDto: CreatePickupAddressDto, @GetUser() user: User) {
    return this.pickupAddressesService.create(user.id, createDto);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.pickupAddressesService.findAllByUser(user.id);
  }

  @Public()
  @Get('public')
  findAllPublic() {
    return this.pickupAddressesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.pickupAddressesService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePickupAddressDto,
    @GetUser() user: User,
  ) {
    return this.pickupAddressesService.update(id, user.id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.pickupAddressesService.remove(id, user.id);
  }
}
