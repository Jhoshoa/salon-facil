import { Test, TestingModule } from '@nestjs/testing';
import { SlugService } from '../../../src/modules/venue/application/services/slug.service';

describe('SlugService', () => {
  let service: SlugService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlugService],
    }).compile();

    service = module.get<SlugService>(SlugService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should convert text to lowercase slug', async () => {
    await expect(service.generateSlug('Mi Salon Perfecto')).resolves.toBe('mi-salon-perfecto');
  });

  it('should remove special characters', async () => {
    await expect(service.generateSlug('Salon #1! @El Alto')).resolves.toBe('salon-1-el-alto');
  });

  it('should handle multiple spaces', async () => {
    await expect(service.generateSlug('Salon   de    fiestas')).resolves.toBe('salon-de-fiestas');
  });

  it('should append counter if slug exists', async () => {
    const checkExists = jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(service.generateSlug('Mi Salon', checkExists)).resolves.toBe('mi-salon-1');
    expect(checkExists).toHaveBeenCalledTimes(2);
  });

  it('should increment counter until unique', async () => {
    const checkExists = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(service.generateSlug('Mi Salon', checkExists)).resolves.toBe('mi-salon-2');
    expect(checkExists).toHaveBeenCalledTimes(3);
  });
});
