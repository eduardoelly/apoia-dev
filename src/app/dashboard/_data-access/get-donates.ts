"use server"

import { prisma } from "@/lib/prisma";

export async function getAllDonates(userId: string) {
  if (!userId) {
    return {
      data: []
    };
  }

  try {
    const donates = await prisma.donation.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        createdAt: true,
        amount: true,
        donorMessage: true,
        donorName: true,
        staus: true
      }
    })

    return {
      data: donates
    }

  } catch (err) {
    return {
      data: []
    };
  }
}
