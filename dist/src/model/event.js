"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EventModel {
    prisma;
    constructor(prismaClient) {
        this.prisma = prismaClient;
    }
    async getPackageById(id) {
        return await this.prisma.package.findUnique({
            where: { id },
            select: {
                name: true,
                price: true,
                event: {
                    select: { name: true },
                },
            },
        });
    }
    async listPromoCodes(packageId) {
        return await this.prisma.promoCode.findMany({
            where: packageId ? { packageId } : undefined,
            select: {
                id: true,
                code: true,
                packageId: true,
                discountPct: true,
                quota: true,
                usedCount: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });
    }
    /**
     * Atomically claim one use of a promo code.
     * Uses a single UPDATE ... WHERE usedCount < quota to prevent race conditions.
     * Returns the discountPct if successful, or null if the code is invalid,
     * not for this package, or quota is exhausted.
     */
    async claimPromoCode(code, packageId) {
        const result = await this.prisma.$queryRaw `
      UPDATE "PromoCode"
      SET "usedCount" = "usedCount" + 1
      WHERE code = ${code}
        AND "packageId" = ${packageId}
        AND "usedCount" < quota
      RETURNING "discountPct"
    `;
        return result.length > 0 ? result[0] : null;
    }
}
exports.default = EventModel;
