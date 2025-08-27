import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { getInfoUser } from './get-info-user'
import { prisma } from '@/lib/prisma'
import { mockData } from '@/mocks'

// Mock do Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

const mockPrismaUser = prisma.user as any

describe('getInfoUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validação de Schema', () => {
    it('deve retornar null quando username não é fornecido', async () => {
      const invalidData = {} as any

      const result = await getInfoUser(invalidData)

      expect(result).toBeNull()
      expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
    })

    it('deve passar validação com username vazio (comportamento atual do Zod)', async () => {
      const validData = { username: '' }
      mockPrismaUser.findUnique.mockResolvedValue(null)

      const result = await getInfoUser(validData)

      expect(result).toBeNull()
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: {
          username: ''
        },
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
          image: true,
          connectedStripeAccountId: true
        }
      })
    })

    it('deve retornar null quando username não é uma string', async () => {
      const invalidData = { username: 123 } as any
      const result = await getInfoUser(invalidData)

      expect(result).toBeNull()
      expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
    })

    it('deve retornar null quando username é null', async () => {
      const invalidData = { username: null } as any

      const result = await getInfoUser(invalidData)

      expect(result).toBeNull()
      expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
    })

    it('deve retornar null quando username é undefined', async () => {
      const invalidData = { username: undefined } as any
      const result = await getInfoUser(invalidData)

      expect(result).toBeNull()
      expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('Busca de Usuário', () => {
    it('deve retornar dados do usuário quando encontrado', async () => {
      const username = mockData.username()
      const mockUser = {
        id: mockData.uuid(),
        name: mockData.name(),
        username: username,
        bio: mockData.bio(),
        image: mockData.image(),
        connectedStripeAccountId: `acct_${faker.string.alphanumeric(16)}`,
      }

      mockPrismaUser.findUnique.mockResolvedValue(mockUser)

      const result = await getInfoUser({ username })

      expect(result).toEqual(mockUser)
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: {
          username: username
        },
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
          image: true,
          connectedStripeAccountId: true
        }
      })
    })

    it('deve retornar null quando usuário não é encontrado', async () => {
      const username = mockData.username()
      mockPrismaUser.findUnique.mockResolvedValue(null)
      const result = await getInfoUser({ username })

      expect(result).toBeNull()
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: {
          username: username
        },
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
          image: true,
          connectedStripeAccountId: true
        }
      })
    })

    it('deve retornar dados do usuário mesmo quando alguns campos opcionais são null', async () => {
      // Arrange
      const username = mockData.username()
      const mockUser = {
        id: mockData.uuid(),
        name: mockData.name(),
        username: username,
        bio: null,
        image: null,
        connectedStripeAccountId: null,
      }

      mockPrismaUser.findUnique.mockResolvedValue(mockUser)

      const result = await getInfoUser({ username })

      expect(result).toEqual(mockUser)
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: {
          username: username
        },
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
          image: true,
          connectedStripeAccountId: true
        }
      })
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve retornar null quando o Prisma lança uma exceção', async () => {
      const username = mockData.username()
      const databaseError = new Error('Database connection failed')
      mockPrismaUser.findUnique.mockRejectedValue(databaseError)
      const result = await getInfoUser({ username })

      expect(result).toBeNull()
      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: {
          username: username
        },
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
          image: true,
          connectedStripeAccountId: true
        }
      })
    })

    it('deve retornar null quando ocorre erro de timeout no banco', async () => {
      const username = mockData.username()
      const timeoutError = new Error('Request timeout')
      mockPrismaUser.findUnique.mockRejectedValue(timeoutError)
      const result = await getInfoUser({ username })

      expect(result).toBeNull()
    })

    it('deve retornar null quando ocorre erro de constraint do banco', async () => {
      const username = mockData.username()
      const constraintError = new Error('Unique constraint violation')
      mockPrismaUser.findUnique.mockRejectedValue(constraintError)
      const result = await getInfoUser({ username })

      expect(result).toBeNull()
    })
  })

  describe('Casos Edge', () => {
    it('deve funcionar com username muito longo', async () => {
      const longUsername = faker.string.alphanumeric(255)
      const mockUser = {
        id: mockData.uuid(),
        name: mockData.name(),
        username: longUsername,
        bio: mockData.bio(),
        image: mockData.image(),
        connectedStripeAccountId: `acct_${faker.string.alphanumeric(16)}`,
      }
      mockPrismaUser.findUnique.mockResolvedValue(mockUser)
      const result = await getInfoUser({ username: longUsername })
      expect(result).toEqual(mockUser)
    })
  })

  describe('Verificação de Campos Selecionados', () => {
    it('deve garantir que apenas os campos especificados são selecionados', async () => {
      const username = mockData.username()
      mockPrismaUser.findUnique.mockResolvedValue(null)
      await getInfoUser({ username })

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: {
          username: username
        },
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
          image: true,
          connectedStripeAccountId: true
        }
      })

      const selectCall = mockPrismaUser.findUnique.mock.calls[0][0].select
      expect(selectCall).not.toHaveProperty('email')
      expect(selectCall).not.toHaveProperty('password')
      expect(selectCall).not.toHaveProperty('createdAt')
      expect(selectCall).not.toHaveProperty('updatedAt')
    })
  })

  describe('Performance e Robustez', () => {
    it('deve lidar com múltiplas chamadas simultâneas', async () => {
      const usernames = Array.from({ length: 5 }, () => mockData.username())
      const promises = usernames.map(username => {
        const mockUser = {
          id: mockData.uuid(),
          name: mockData.name(),
          username: username,
          bio: mockData.bio(),
          image: mockData.image(),
          connectedStripeAccountId: `acct_${faker.string.alphanumeric(16)}`,
        }

        mockPrismaUser.findUnique.mockResolvedValueOnce(mockUser)
        return getInfoUser({ username })
      })
      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach((result, index) => {
        expect(result?.username).toBe(usernames[index])
      })
      expect(mockPrismaUser.findUnique).toHaveBeenCalledTimes(5)
    })
  })
})
