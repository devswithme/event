import { PrismaClient } from "../generated/prisma/client";

class EventModel {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  async getPackageById(id: string) {
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

export default EventModel;
