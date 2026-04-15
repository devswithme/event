"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EventModel {
    prisma;
    constructor(prismaClient) {
        this.prisma = prismaClient;
    }
    async getPackageById(id) {
        return await this.prisma.package.findUnique({
            where: {
                id,
            },
            select: {
                name: true,
                price: true,
                event: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }
}
exports.default = EventModel;
