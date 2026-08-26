import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CreateReviewData,
  IReviewRepository,
} from '../../domain/repositories/review.repository.interface';
import { ReviewEntity } from '../../domain/entities/review.entity';

type RawReview = {
  id: string;
  venueId: string;
  clientId: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  isVerified: boolean;
  ownerResponse: string | null;
  ownerResponseAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  client?: { id: string; fullName: string; email: string } | null;
};

const reviewInclude = { client: { select: { id: true, fullName: true, email: true } } };

@Injectable()
export class ReviewRepository implements IReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateReviewData): Promise<ReviewEntity> {
    const review = await this.prisma.review.create({
      data: {
        venueId: data.venueId,
        clientId: data.clientId,
        bookingId: data.bookingId,
        rating: data.rating,
        comment: data.comment,
        isVerified: true,
      },
      include: reviewInclude,
    });
    return this.toEntity(review);
  }

  async findById(id: string): Promise<ReviewEntity | null> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: reviewInclude,
    });
    return review ? this.toEntity(review) : null;
  }

  async findByBookingId(bookingId: string): Promise<ReviewEntity | null> {
    const review = await this.prisma.review.findUnique({
      where: { bookingId },
      include: reviewInclude,
    });
    return review ? this.toEntity(review) : null;
  }

  async findByVenue(
    venueId: string,
    page: number,
    limit: number,
  ): Promise<{ items: ReviewEntity[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { venueId },
        include: reviewInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where: { venueId } }),
    ]);

    return { items: items.map((item) => this.toEntity(item)), total };
  }

  async update(
    id: string,
    data: { rating?: number; comment?: string | null },
  ): Promise<ReviewEntity> {
    const review = await this.prisma.review.update({
      where: { id },
      data,
      include: reviewInclude,
    });
    return this.toEntity(review);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.review.delete({ where: { id } });
  }

  async setOwnerResponse(id: string, response: string): Promise<ReviewEntity> {
    const review = await this.prisma.review.update({
      where: { id },
      data: { ownerResponse: response, ownerResponseAt: new Date() },
      include: reviewInclude,
    });
    return this.toEntity(review);
  }

  private toEntity(raw: RawReview): ReviewEntity {
    return new ReviewEntity({
      id: raw.id,
      venueId: raw.venueId,
      clientId: raw.clientId,
      bookingId: raw.bookingId,
      rating: raw.rating,
      comment: raw.comment,
      isVerified: raw.isVerified,
      ownerResponse: raw.ownerResponse,
      ownerResponseAt: raw.ownerResponseAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      client: raw.client ?? undefined,
    });
  }
}
