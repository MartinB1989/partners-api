import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { GeneratePresignedUrlDto } from './dto/generate-presigned-url.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../../generated/prisma';
import { Request } from 'express';

export interface RequestWithUser extends Request {
  user: User;
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productsService.create(createProductDto, req.user.id);
  }

  @Get()
  findAll(@Query('page') page: string, @Query('limit') limit: string) {
    return this.productsService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-products')
  findAllByUser(
    @Req() req: RequestWithUser,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.productsService.findAllByUser(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productsService.update(id, updateProductDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.productsService.remove(id, req.user.id);
  }

  // Endpoints para manejar imágenes

  /**
   * Genera una URL prefirmada para subir una imagen a S3
   */
  @UseGuards(JwtAuthGuard)
  @Post('images/presigned-url')
  generatePresignedUrl(
    @Body() generatePresignedUrlDto: GeneratePresignedUrlDto,
  ) {
    return this.productsService.generatePresignedUrl(generatePresignedUrlDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/images')
  addImage(
    @Param('id') id: string,
    @Body() createImageDto: CreateProductImageDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productsService.addProductImage(
      id,
      createImageDto,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':productId/images/:imageId')
  removeImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.productsService.removeProductImage(
      productId,
      imageId,
      req.user.id,
    );
  }

  /**
   * Genera una URL prefirmada para eliminar una imagen de S3
   */
  @UseGuards(JwtAuthGuard)
  @Get(':productId/images/:imageId/delete-url')
  generateDeletePresignedUrl(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.productsService.generateDeletePresignedUrl(
      productId,
      imageId,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':productId/images/:imageId/set-main')
  setMainImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.productsService.setMainImage(productId, imageId, req.user.id);
  }
}
