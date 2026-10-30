import { BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from '../../../src/modules/upload/cloudinary.service';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { destroy: jest.fn(), upload_stream: jest.fn() },
  },
}));

const destroy = cloudinary.uploader.destroy as jest.Mock;
const uploadStream = cloudinary.uploader.upload_stream as jest.Mock;

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    service = new CloudinaryService({
      get: () => 'configured',
    } as unknown as ConfigService);
    service.onModuleInit();
    warn.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('deleteImage', () => {
    it('pide tambien borrar las copias del CDN', async () => {
      destroy.mockResolvedValue({ result: 'ok' });

      await service.deleteImage('foto');

      expect(destroy).toHaveBeenCalledWith('foto', { invalidate: true });
      expect(warn).not.toHaveBeenCalled();
    });

    it('no considera un problema que el archivo ya no exista', async () => {
      destroy.mockResolvedValue({ result: 'not found' });

      await expect(service.deleteImage('foto')).resolves.toBeUndefined();
      expect(warn).not.toHaveBeenCalled();
    });

    it('deja registro del archivo si Cloudinary responde otra cosa', async () => {
      destroy.mockResolvedValue({ result: 'error' });

      await service.deleteImage('foto');

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('foto'));
    });

    it('deja registro del archivo y propaga el error si la llamada falla', async () => {
      destroy.mockRejectedValue(new Error('sin red'));

      await expect(service.deleteImage('foto')).rejects.toThrow('sin red');
      expect(error).toHaveBeenCalledWith(expect.stringContaining('foto'));
    });
  });

  describe('uploadImage', () => {
    const file = { buffer: Buffer.from('x') } as Express.Multer.File;

    const uploadFailingWith = (cloudinaryError: object) => {
      uploadStream.mockImplementation((_options, callback) => ({
        end: () => callback(cloudinaryError, undefined),
      }));
      return service.uploadImage(file, 'carpeta');
    };

    it('responde 400 si Cloudinary rechaza el archivo', async () => {
      await expect(uploadFailingWith({ http_code: 400 })).rejects.toThrow(BadRequestException);
    });

    it('no disfraza de 400 un fallo del servicio', async () => {
      await expect(uploadFailingWith({ http_code: 500 })).rejects.not.toThrow(BadRequestException);
    });
  });
});
