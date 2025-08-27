import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const GET = auth(async function GET(request){
  if(!request.auth){
    return NextResponse.json({ message: "Usuário não autenticado" }, { status: 401 })
  }

  try {
    const donates = await await prisma.donation.findMany({
      where: {
        userId: request.auth.user?.id,
        staus: "PAID"
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json({ data: donates })
  } catch (err) {
    return NextResponse.json({ message: "Falha ao buscar dados" }, { status: 500 })
  }
})
