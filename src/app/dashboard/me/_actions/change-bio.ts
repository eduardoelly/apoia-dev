"use server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const chengeDescriptionSchema = z.object({
  description: z.string().min(4, "A descrição precisa ter no mínimo 4 caracteres"),
})

type ChangeDescriptionParams = z.infer<typeof chengeDescriptionSchema>

export async function changeBio(data: ChangeDescriptionParams) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return {
      data: null,
      error: "Usuário não autenticado",
    }
  }

  const schema = chengeDescriptionSchema.safeParse(data)

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
        bio: data.description,
      },
    })

    return {
      data: user.bio,
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: "Falha ao salvar alterações",
    }
  }
}