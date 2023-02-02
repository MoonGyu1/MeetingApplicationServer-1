import { UserCoupon } from './../../users/interfaces/user-coupon.interface';
import { CustomRepository } from 'src/database/typeorm-ex.decorator';
import { Coupon } from '../entities/coupon.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import * as moment from 'moment-timezone';

@CustomRepository(Coupon)
export class CouponsRepository extends Repository<Coupon> {
  async getCouponById(couponId: number): Promise<Coupon> {
    const coupon = await this.findOneBy({ id: couponId });

    if (!coupon) {
      throw new NotFoundException(`Can't find coupon with id ${couponId}`);
    }

    return coupon;
  }

  async updateUsedAt(couponId: number): Promise<void> {
    await this.update({ id: couponId }, { usedAt: moment().tz('Asia/Seoul').format() });
  }

  async getCouponCountByUserId(userId: number): Promise<{ couponCount: number }> {
    const today = moment().tz('Asia/Seoul').format('YYYY-MM-DD');

    const couponCount = await this.createQueryBuilder('coupon')
      .where('coupon.userId = :userId', { userId })
      .andWhere('coupon.usedAt IS NULL')
      .andWhere('coupon.expiresAt IS null OR coupon.expiresAt >= :today', { today })
      .getCount();

    return { couponCount };
  }

  async getCouponsByUserId(userId: number): Promise<{ coupons: UserCoupon[] }> {
    const today = moment().tz('Asia/Seoul').format('YYYY-MM-DD');

    const coupons = await this.createQueryBuilder('coupon')
      .select('coupon.id')
      .addSelect('coupon.type')
      .addSelect('coupon.expiresAt')
      .where('coupon.userId = :userId', { userId })
      .andWhere('coupon.usedAt IS NULL')
      .andWhere('coupon.expiresAt IS null OR coupon.expiresAt >= :today', { today })
      .getMany();

    return { coupons };
  }

  async getCouponByCode(couponCode: string): Promise<Coupon> {
    const coupon = await this.findOneBy({ code: couponCode });

    if (!coupon) {
      throw new NotFoundException(`Can't find coupon with code ${couponCode}`);
    }

    return coupon;
  }

  async registerCoupon(couponId: number, userId: number): Promise<void> {
    await this.createQueryBuilder().relation(Coupon, 'user').of(couponId).set(userId);
  }
}
