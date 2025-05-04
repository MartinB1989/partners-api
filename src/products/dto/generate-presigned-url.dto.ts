import { IsNotEmpty, IsString, IsIn, Matches } from 'class-validator';

export class GeneratePresignedUrlDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^(jpg|jpeg|png|webp)$/, {
    message: 'La extensión debe ser jpg, jpeg, png o webp',
  })
  fileExtension: string;
}
