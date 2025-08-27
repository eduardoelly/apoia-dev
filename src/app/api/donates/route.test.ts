import { NextResponse } from 'next/server'
import { mockData } from '@/mocks'
import { vi } from 'vitest'

// Mock do auth
const mockAuth = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: (handler: any) => mockAuth.mockImplementation(handler),
}))

// Mock do prisma
const mockPrisma = {
  donation: {
    findMany: vi.fn(),
  },
}
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock do NextResponse - usando configuração inline (não pode ser importada devido ao hoisting)
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      ...data,
      ...options,
    })),
  },
}))
describe('API /donates', () => {
  let mockRequest: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockRequest = {
      auth: {
        user: {
          id: mockData.uuid(),
          email: mockData.email(),
          name: mockData.name(),
        },
      },
    }
  })

  describe('GET /api/donates', () => {
    it('deve retornar erro 401 quando usuário não está autenticado', async () => {
      mockRequest.auth = null

      const { GET } = await import('./route')
      const response = await GET(mockRequest, { params: Promise.resolve({}) })

      expect(NextResponse.json).toHaveBeenCalledWith(
        { message: 'Usuário não autenticado' },
        { status: 401 }
      )
    })

    it('deve retornar doações do usuário autenticado', async () => {
      const mockDonations = [
        {
          id: mockData.uuid(),
          userId: mockRequest.auth.user.id,
          amount: mockData.number(100, 10000),
          donorName: mockData.name(),
          donorMessage: mockData.sentence(),
          staus: 'PAID',
          createdAt: mockData.date(),
          updatedAt: mockData.date(),
        },
        {
          id: mockData.uuid(),
          userId: mockRequest.auth.user.id,
          amount: mockData.number(100, 10000),
          donorName: mockData.name(),
          donorMessage: mockData.sentence(),
          staus: 'PAID',
          createdAt: mockData.date(),
          updatedAt: mockData.date(),
        },
      ]

      mockPrisma.donation.findMany.mockResolvedValue(mockDonations)

      const { GET } = await import('./route')
      const response = await GET(mockRequest, { params: Promise.resolve({}) })

      expect(mockPrisma.donation.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockRequest.auth.user.id,
          staus: 'PAID',
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      expect(NextResponse.json).toHaveBeenCalledWith({
        data: mockDonations,
      })
    })

    it('deve retornar lista vazia quando usuário não tem doações', async () => {
      mockPrisma.donation.findMany.mockResolvedValue([])

      const { GET } = await import('./route')
      const response = await GET(mockRequest, { params: Promise.resolve({}) })

      expect(mockPrisma.donation.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockRequest.auth.user.id,
          staus: 'PAID',
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      expect(NextResponse.json).toHaveBeenCalledWith({
        data: [],
      })
    })

    it('deve filtrar apenas doações com status PAID', async () => {
      const mockDonations = [
        {
          id: mockData.uuid(),
          userId: mockRequest.auth.user.id,
          amount: mockData.number(100, 10000),
          staus: 'PAID',
          createdAt: mockData.date(),
        },
      ]

      mockPrisma.donation.findMany.mockResolvedValue(mockDonations)

      const { GET } = await import('./route')
      await GET(mockRequest, { params: Promise.resolve({}) })

      expect(mockPrisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            staus: 'PAID',
          }),
        })
      )
    })

    it('deve ordenar doações por data de criação em ordem decrescente', async () => {
      const mockDonations = [
        {
          id: mockData.uuid(),
          userId: mockRequest.auth.user.id,
          amount: mockData.number(100, 10000),
          staus: 'PAID',
          createdAt: mockData.date(),
        },
      ]

      mockPrisma.donation.findMany.mockResolvedValue(mockDonations)

      const { GET } = await import('./route')
      await GET(mockRequest, { params: Promise.resolve({}) })

      expect(mockPrisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: 'desc',
          },
        })
      )
    })

    it('deve retornar erro 500 quando há falha no banco de dados', async () => {
      const dbError = new Error('Database connection failed')
      mockPrisma.donation.findMany.mockRejectedValue(dbError)

      const { GET } = await import('./route')
      const response = await GET(mockRequest, { params: Promise.resolve({}) })

      expect(NextResponse.json).toHaveBeenCalledWith(
        { message: 'Falha ao buscar dados' },
        { status: 500 }
      )
    })

    it('deve lidar com erro quando user.id é undefined', async () => {
      mockRequest.auth.user.id = undefined

      mockPrisma.donation.findMany.mockResolvedValue([])

      const { GET } = await import('./route')
      await GET(mockRequest, { params: Promise.resolve({}) })

      expect(mockPrisma.donation.findMany).toHaveBeenCalledWith({
        where: {
          userId: undefined,
          staus: 'PAID',
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('deve retornar doações com estrutura de dados correta', async () => {
      const mockDonation = {
        id: mockData.uuid(),
        userId: mockRequest.auth.user.id,
        amount: mockData.number(100, 10000),
        donorName: mockData.name(),
        donorMessage: mockData.sentence(),
        donorEmail: mockData.email(),
        staus: 'PAID',
        createdAt: mockData.date(),
        updatedAt: mockData.date(),
        stripePaymentIntentId: 'test_stripe_id_' + mockData.uuid(),
      }

      mockPrisma.donation.findMany.mockResolvedValue([mockDonation])

      const { GET } = await import('./route')
      const response = await GET(mockRequest, { params: Promise.resolve({}) })

      expect(NextResponse.json).toHaveBeenCalledWith({
        data: [mockDonation],
      })
    })

    it('deve lidar com diferentes tipos de erro do Prisma', async () => {
      const prismaError = new Error('P2002: Unique constraint failed')
      prismaError.name = 'PrismaClientKnownRequestError'
      
      mockPrisma.donation.findMany.mockRejectedValue(prismaError)

      const { GET } = await import('./route')
      const response = await GET(mockRequest, { params: Promise.resolve({}) })

      expect(NextResponse.json).toHaveBeenCalledWith(
        { message: 'Falha ao buscar dados' },
        { status: 500 }
      )
    })

    it('deve funcionar com grandes volumes de doações', async () => {
      const largeDonationsList = Array.from({ length: 100 }, () => ({
        id: mockData.uuid(),
        userId: mockRequest.auth.user.id,
        amount: mockData.number(100, 10000),
        donorName: mockData.name(),
        donorMessage: mockData.sentence(),
        staus: 'PAID',
        createdAt: mockData.date(),
        updatedAt: mockData.date(),
      }))

      mockPrisma.donation.findMany.mockResolvedValue(largeDonationsList)

      const { GET } = await import('./route')
      const response = await GET(mockRequest, { params: Promise.resolve({}) })

      expect(NextResponse.json).toHaveBeenCalledWith({
        data: largeDonationsList,
      })
      expect(largeDonationsList).toHaveLength(100)
    })
  })

  describe('Autenticação e Segurança', () => {
    it('deve garantir que apenas o usuário logado veja suas doações', async () => {
      const anotherUserId = mockData.uuid()
      
      mockPrisma.donation.findMany.mockResolvedValue([])

      const { GET } = await import('./route')
      await GET(mockRequest, { params: Promise.resolve({}) })

      expect(mockPrisma.donation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockRequest.auth.user.id,
          }),
        })
      )

      expect(mockPrisma.donation.findMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: anotherUserId,
          }),
        })
      )
    })
  })
})
