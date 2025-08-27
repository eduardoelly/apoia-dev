"use server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const chengeNameSchema = z.object({
  name: z.string().min(4, "O username precisa ter no mínimo 4 caracteres"),
})

type ChangeNameParams = z.infer<typeof chengeNameSchema>

export async function changeName(data: ChangeNameParams) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return {
      data: null,
      error: "Usuário não autenticado",
    }
  }

  const schema = chengeNameSchema.safeParse(data)

  if (!schema.success) {
    return {
      data: null,
      error: schema.error.issues[0].message,
    }
  }

  try {
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name: data.name,
      },
    })

    return {
      data: user.name,
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: "Falha ao salvar alterações",
    }
  }
}