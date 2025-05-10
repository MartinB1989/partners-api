import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AwsService {
  private s3Client: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    // Inicializar el cliente S3 con las credenciales de AWS
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>(
          'AWS_S3_ACCESS_KEY_ID',
        ),
        secretAccessKey: this.configService.getOrThrow<string>(
          'AWS_S3_SECRET_ACCESS_KEY',
        ),
      },
    });

    // Obtener el nombre del bucket desde las variables de entorno
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
  }

  /**
   * Genera una URL prefirmada para subir una imagen a S3
   * @param fileExtension Extensión del archivo (jpg, png, etc.)
   * @param contentType Tipo de contenido MIME del archivo
   * @returns Objeto con la URL prefirmada y la clave (key) del archivo en S3
   */
  async getPresignedUrlForUpload(
    fileExtension: string,
    contentType: string,
  ): Promise<{
    presignedUrl: string;
    key: string;
    publicUrl: string;
  }> {
    // Generar una clave única para el archivo
    const key = `images/${uuidv4()}.${fileExtension}`;

    // Crear el comando para subir el objeto
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    // Generar la URL prefirmada (expira en 10 minutos)
    const presignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 1800,
    });

    // Generar la URL pública para acceder al archivo después de subido
    const publicUrl = `https://${this.bucket}.s3.${this.configService.get<string>(
      'AWS_REGION',
    )}.amazonaws.com/${key}`;

    return { presignedUrl, key, publicUrl };
  }

  /**
   * Genera una URL prefirmada para eliminar una imagen de S3
   * @param key Clave del archivo en S3
   * @returns URL prefirmada para eliminar el archivo
   */
  async getPresignedUrlForDelete(key: string): Promise<string> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    // Generar la URL prefirmada (expira en 10 minutos)
    return getSignedUrl(this.s3Client, command, { expiresIn: 600 });
  }

  /**
   * Genera la URL pública para un archivo en S3
   * @param key Clave del archivo en S3
   * @returns URL pública del archivo
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.configService.get<string>(
      'AWS_REGION',
    )}.amazonaws.com/${key}`;
  }
}
