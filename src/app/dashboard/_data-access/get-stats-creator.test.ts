import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { getStats } from './get-stats-creator'

// Mock do prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    donation: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}))

// Mock do stripe
vi.mock('@/lib/stripe', () => ({
  stripe: {
    balance: {
      retrieve: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

const mockPrisma = prisma as any
const mockStripe = stripe as any

describe('getStats', () => {
  const mockData = {
    userId: () => faker.string.uuid(),
    stripeAccountId: () => faker.string.alphanumeric(21),
    totalDonations: () => faker.number.int({ min: 0, max: 1000 }),
    totalAmount: () => faker.number.int({ min: 0, max: 1000000 }),
    balanceAmount: () => faker.number.int({ min: 0, max: 500000 }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validação de Parâmetros', () => {
    it('deve retornar erro quando userId é string vazia', async () => {
      const stripeAccountId = mockData.stripeAccountId()
      const result = await getStats('', stripeAccountId)
      expect(result).toEqual({ error: "Usuário não autenticado" })
      expect(mockPrisma.donation.count).not.toHaveBeenCalled()
      expect(mockPrisma.donation.aggregate).not.toHaveBeenCalled()
      expect(mockStripe.balance.retrieve).not.toHaveBeenCalled()
    })

    it('deve retornar erro quando userId é undefined', async () => {
      const stripeAccountId = mockData.stripeAccountId()
      const result = await getStats(undefined as any, stripeAccountId)
      expect(result).toEqual({ error: "Usuário não autenticado" })
      expect(mockPrisma.donation.count).not.toHaveBeenCalled()
      expect(mockPrisma.donation.aggregate).not.toHaveBeenCalled()
      expect(mockStripe.balance.retrieve).not.toHaveBeenCalled()
    })

    it('deve retornar erro quando userId é null', async () => {
      const stripeAccountId = mockData.stripeAccountId()
      const result = await getStats(null as any, stripeAccountId)
      expect(result).toEqual({ error: "Usuário não autenticado" })
    })
  })

  describe('Busca de Estatísticas', () => {
    it('deve buscar contagem de doações com parâmetros corretos', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      const totalDonations = mockData.totalDonations()
      const totalAmount = mockData.totalAmount()
      const balance = mockData.balanceAmount()
      mockPrisma.donation.count.mockResolvedValue(totalDonations)
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: totalAmount } })
      mockStripe.balance.retrieve.mockResolvedValue({ pending: [{ amount: balance }] })
      await getStats(userId, stripeAccountId)
      expect(mockPrisma.donation.count).toHaveBeenCalledWith({
        where: {
          userId: userId,
          staus: "PAID"
        }
      })
    })

    it('deve buscar soma de valores com parâmetros corretos', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      const totalDonations = mockData.totalDonations()
      const totalAmount = mockData.totalAmount()
      const balance = mockData.balanceAmount()
      mockPrisma.donation.count.mockResolvedValue(totalDonations)
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: totalAmount } })
      mockStripe.balance.retrieve.mockResolvedValue({ pending: [{ amount: balance }] })
      await getStats(userId, stripeAccountId)

      expect(mockPrisma.donation.aggregate).toHaveBeenCalledWith({
        where: {
          userId: userId,
          staus: "PAID"
        },
        _sum: {
          amount: true
        }
      })
    })

    it('deve buscar saldo do Stripe com stripeAccountId correto', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      const totalDonations = mockData.totalDonations()
      const totalAmount = mockData.totalAmount()
      const balance = mockData.balanceAmount()
      mockPrisma.donation.count.mockResolvedValue(totalDonations)
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: totalAmount } })
      mockStripe.balance.retrieve.mockResolvedValue({ pending: [{ amount: balance }] })
      await getStats(userId, stripeAccountId)
      expect(mockStripe.balance.retrieve).toHaveBeenCalledWith({
        stripeAccount: stripeAccountId
      })
    })

    it('deve retornar estatísticas completas quando todas as operações são bem-sucedidas', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      const totalDonations = mockData.totalDonations()
      const totalAmount = mockData.totalAmount()
      const balance = mockData.balanceAmount()
      mockPrisma.donation.count.mockResolvedValue(totalDonations)
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: totalAmount } })
      mockStripe.balance.retrieve.mockResolvedValue({ pending: [{ amount: balance }] })
      const result = await getStats(userId, stripeAccountId)
      expect(result).toEqual({
        totalQtdDonations: totalDonations,
        totalAmountResults: totalAmount,
        balance: balance
      })
    })

    it('deve usar 0 como valor padrão quando _sum.amount é null', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      const totalDonations = mockData.totalDonations()
      const balance = mockData.balanceAmount()
      mockPrisma.donation.count.mockResolvedValue(totalDonations)
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: null } })
      mockStripe.balance.retrieve.mockResolvedValue({ pending: [{ amount: balance }] })
      const result = await getStats(userId, stripeAccountId)
      expect(result).toEqual({
        totalQtdDonations: totalDonations,
        totalAmountResults: 0,
        balance: balance
      })
    })

    it('deve usar 0 como valor padrão quando balance.pending está vazio', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      const totalDonations = mockData.totalDonations()
      const totalAmount = mockData.totalAmount()
      mockPrisma.donation.count.mockResolvedValue(totalDonations)
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: totalAmount } })
      mockStripe.balance.retrieve.mockResolvedValue({ pending: [] })
      const result = await getStats(userId, stripeAccountId)
      expect(result).toEqual({
        totalQtdDonations: totalDonations,
        totalAmountResults: totalAmount,
        balance: 0
      })
    })

    it('deve usar 0 como valor padrão quando balance é undefined', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      const totalDonations = mockData.totalDonations()
      const totalAmount = mockData.totalAmount()
      mockPrisma.donation.count.mockResolvedValue(totalDonations)
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: totalAmount } })
      mockStripe.balance.retrieve.mockResolvedValue({ pending: undefined })
      const result = await getStats(userId, stripeAccountId)
      expect(result).toEqual({ error: "Falha ao buscar estatísticas" })
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve retornar erro quando prisma.donation.count falha', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      mockPrisma.donation.count.mockRejectedValue(new Error('Database error'))
      const result = await getStats(userId, stripeAccountId)
      expect(result).toEqual({ error: "Falha ao buscar estatísticas" })
    })

    it('deve retornar erro quando prisma.donation.aggregate falha', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      const totalDonations = mockData.totalDonations()
      mockPrisma.donation.count.mockResolvedValue(totalDonations)
      mockPrisma.donation.aggregate.mockRejectedValue(new Error('Aggregate error'))
      const result = await getStats(userId, stripeAccountId)
      expect(result).toEqual({ error: "Falha ao buscar estatísticas" })
    })

    it('deve retornar erro quando stripe.balance.retrieve falha', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      const totalDonations = mockData.totalDonations()
      const totalAmount = mockData.totalAmount()
      mockPrisma.donation.count.mockResolvedValue(totalDonations)
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: totalAmount } })
      mockStripe.balance.retrieve.mockRejectedValue(new Error('Stripe API error'))
      const result = await getStats(userId, stripeAccountId)

      expect(result).toEqual({ error: "Falha ao buscar estatísticas" })
    })

    it('deve retornar erro quando há timeout na conexão com banco', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      mockPrisma.donation.count.mockRejectedValue(new Error('Connection timeout'))
      const result = await getStats(userId, stripeAccountId)
      expect(result).toEqual({ error: "Falha ao buscar estatísticas" })
    })

    it('deve retornar erro quando Stripe retorna erro de autenticação', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      const totalDonations = mockData.totalDonations()
      const totalAmount = mockData.totalAmount()
      mockPrisma.donation.count.mockResolvedValue(totalDonations)
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: totalAmount } })
      mockStripe.balance.retrieve.mockRejectedValue(new Error('Authentication failed'))
      const result = await getStats(userId, stripeAccountId)
      expect(result).toEqual({ error: "Falha ao buscar estatísticas" })
    })
  })

  describe('Casos Edge', () => {
    it('deve lidar com contagem zero de doações', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      const balance = mockData.balanceAmount()
      mockPrisma.donation.count.mockResolvedValue(0)
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockStripe.balance.retrieve.mockResolvedValue({ pending: [{ amount: balance }] })
      const result = await getStats(userId, stripeAccountId)
      expect(result).toEqual({
        totalQtdDonations: 0,
        totalAmountResults: 0,
        balance: balance
      })
    })

    it('deve lidar com stripeAccountId vazio', async () => {
      const userId = mockData.userId()
      const stripeAccountId = ''
      const totalDonations = mockData.totalDonations()
      const totalAmount = mockData.totalAmount()
      mockPrisma.donation.count.mockResolvedValue(totalDonations)
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: totalAmount } })
      mockStripe.balance.retrieve.mockRejectedValue(new Error('Invalid account'))
      const result = await getStats(userId, stripeAccountId)
      expect(result).toEqual({ error: "Falha ao buscar estatísticas" })
    })

    it('deve lidar com response do Stripe sem estrutura esperada', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      const totalDonations = mockData.totalDonations()
      const totalAmount = mockData.totalAmount()
      mockPrisma.donation.count.mockResolvedValue(totalDonations)
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: totalAmount } })
      mockStripe.balance.retrieve.mockResolvedValue({})
      const result = await getStats(userId, stripeAccountId)
      expect(result).toEqual({ error: "Falha ao buscar estatísticas" })
    })

    it('deve filtrar apenas doações com status PAID', async () => {
      const userId = mockData.userId()
      const stripeAccountId = mockData.stripeAccountId()
      mockPrisma.donation.count.mockResolvedValue(5)
      mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: 10000 } })
      mockStripe.balance.retrieve.mockResolvedValue({ pending: [{ amount: 5000 }] })
      await getStats(userId, stripeAccountId)
      expect(mockPrisma.donation.count).toHaveBeenCalledWith({
        where: {
          userId: userId,
          staus: "PAID"
        }
      })
      expect(mockPrisma.donation.aggregate).toHaveBeenCalledWith({
        where: {
          userId: userId,
          staus: "PAID"
        },
        _sum: {
          amount: true
        }
      })
    })
  })
})
