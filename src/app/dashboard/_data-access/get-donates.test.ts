import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { getAllDonates } from './get-donates'

// Mock do prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    donation: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

const mockPrisma = prisma as any

describe('getAllDonates', () => {
  const mockData = {
    userId: () => faker.string.uuid(),
    donation: () => ({
      id: faker.string.uuid(),
      createdAt: faker.date.recent(),
      amount: faker.number.int({ min: 1000, max: 50000 }),
      donorMessage: faker.lorem.sentence(),
      donorName: faker.person.fullName(),
      staus: faker.helpers.arrayElement(['PENDING', 'PAID', 'CANCELLED']),
    }),
    donations: () => Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => mockData.donation()),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validação de Parâmetros', () => {
    it('deve retornar array vazio quando userId é string vazia', async () => {
      const result = await getAllDonates('')
      expect(result).toEqual({ data: [] })
      expect(mockPrisma.donation.findMany).not.toHaveBeenCalled()
    })

    it('deve retornar array vazio quando userId é undefined', async () => {
      const result = await getAllDonates(undefined as any)
      expect(result).toEqual({ data: [] })
      expect(mockPrisma.donation.findMany).not.toHaveBeenCalled()
    })

    it('deve retornar array vazio quando userId é null', async () => {
      const result = await getAllDonates(null as any)
      expect(result).toEqual({ data: [] })
      expect(mockPrisma.donation.findMany).not.toHaveBeenCalled()
    })
  })

  describe('Busca de Doações', () => {
    it('deve buscar doações com parâmetros corretos', async () => {
      const userId = mockData.userId()
      const donations = mockData.donations()
      mockPrisma.donation.findMany.mockResolvedValue(donations)
      const result = await getAllDonates(userId)
      expect(mockPrisma.donation.findMany).toHaveBeenCalledWith({
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
      expect(result).toEqual({ data: donations })
    })

    it('deve retornar lista de doações quando encontradas', async () => {
      const userId = mockData.userId()
      const donations = mockData.donations()
      mockPrisma.donation.findMany.mockResolvedValue(donations)
      const result = await getAllDonates(userId)
      expect(result).toEqual({ data: donations })
    })

    it('deve retornar array vazio quando não há doações', async () => {
      const userId = mockData.userId()
      mockPrisma.donation.findMany.mockResolvedValue([])
      const result = await getAllDonates(userId)
      expect(result).toEqual({ data: [] })
    })

    it('deve ordenar doações por createdAt descendente', async () => {
      const userId = mockData.userId()
      const donations = [
        { ...mockData.donation(), createdAt: faker.date.past() },
        { ...mockData.donation(), createdAt: faker.date.recent() },
      ]

      mockPrisma.donation.findMany.mockResolvedValue(donations)
      await getAllDonates(userId)
      expect(mockPrisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: "desc"
          }
        })
      )
    })

    it('deve selecionar apenas campos necessários', async () => {
      const userId = mockData.userId()
      const donations = mockData.donations()
      mockPrisma.donation.findMany.mockResolvedValue(donations)
      await getAllDonates(userId)
      expect(mockPrisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            id: true,
            createdAt: true,
            amount: true,
            donorMessage: true,
            donorName: true,
            staus: true
          }
        })
      )
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve retornar array vazio quando prisma lança erro', async () => {
      const userId = mockData.userId()
      mockPrisma.donation.findMany.mockRejectedValue(new Error('Database error'))
      const result = await getAllDonates(userId)
      expect(result).toEqual({ data: [] })
    })

    it('deve retornar array vazio quando há erro de conexão com banco', async () => {
      const userId = mockData.userId()
      mockPrisma.donation.findMany.mockRejectedValue(new Error('Connection timeout'))
      const result = await getAllDonates(userId)
      expect(result).toEqual({ data: [] })
    })

    it('deve retornar array vazio quando há erro de constraint', async () => {
      const userId = mockData.userId()
      mockPrisma.donation.findMany.mockRejectedValue(new Error('Foreign key constraint'))
      const result = await getAllDonates(userId)
      expect(result).toEqual({ data: [] })
    })

    it('deve retornar array vazio quando há erro de sintaxe SQL', async () => {
      const userId = mockData.userId()
      mockPrisma.donation.findMany.mockRejectedValue(new Error('SQL syntax error'))
      const result = await getAllDonates(userId)
      expect(result).toEqual({ data: [] })
    })
  })
})
