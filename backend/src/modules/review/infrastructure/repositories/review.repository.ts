import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  venue?: { id: string; name: string; slug: string } | null;
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

  async findAllForAdmin(params: {
    search?: string;
    rating?: number;
    hasResponse?: boolean;
    page: number;
    limit: number;
  }): Promise<{ items: ReviewEntity[]; total: number }> {
    const where: Prisma.ReviewWhereInput = {
      ...(params.rating && { rating: params.rating }),
      ...(params.hasResponse === true && { ownerResponse: { not: null } }),
      ...(params.hasResponse === false && { ownerResponse: null }),
      ...(params.search && {
        OR: [
          { comment: { contains: params.search, mode: 'insensitive' } },
          { venue: { name: { contains: params.search, mode: 'insensitive' } } },
          { client: { fullName: { contains: params.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: { ...reviewInclude, venue: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.review.count({ where }),
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
      venue: raw.venue ?? undefined,
    });
  }
}
