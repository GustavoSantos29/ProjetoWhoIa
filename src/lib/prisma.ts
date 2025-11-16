//singleton do prisma ( usar isso ao invés e criar novo objeto prisma pras conexões)

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
