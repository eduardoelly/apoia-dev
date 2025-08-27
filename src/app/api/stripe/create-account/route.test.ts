import { NextResponse } from 'next/server'
import { vi } from 'vitest'
import { mockData } from '@/mocks'

// Mock do auth
const mockAuth = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: (handler: any) => mockAuth.mockImplementation(handler),
}))

// Mock do stripe
const mockStripe = {
  accounts: {
    create: vi.fn(),
  },
  accountLinks: {
    create: vi.fn(),
  },
}
vi.mock('@/lib/stripe', () => ({
  stripe: mockStripe,
}))

// Mock do prisma
const mockPrisma = {
  user: {
    update: vi.fn(),
  },
}
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock do NextResponse
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

// Mock de variáveis de ambiente
const originalEnv = process.env
beforeAll(() => {
  process.env = {
    ...originalEnv,
    HOST_URL: 'http://localhost:3000'
  }
})

afterAll(() => {
  process.env = originalEnv
})

describe('POST /api/stripe/create-account', () => {
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

  it('deve retornar erro 401 quando usuário não está autenticado', async () => {
    // Arrange
    mockRequest.auth = null

    // Act
    const { POST } = await import('./route')
    const response = await POST(mockRequest as any, { params: {} } as any)

    // Assert
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Usuário não autenticado' },
      { status: 401 }
    )
  })

  it('deve criar conta Stripe e account link com sucesso', async () => {
    // Arrange
    const mockAccountId = `acct_${mockData.alphanumeric(16)}`
    const mockAccountLinkUrl = mockData.url()

    mockStripe.accounts.create.mockResolvedValue({
      id: mockAccountId,
    })

    mockStripe.accountLinks.create.mockResolvedValue({
      url: mockAccountLinkUrl,
    })

    mockPrisma.user.update.mockResolvedValue({
      id: mockRequest.auth.user.id,
      connectedStripeAccountId: mockAccountId,
    })

    // Act
    const { POST } = await import('./route')
    const response = await POST(mockRequest as any, { params: {} } as any)

    // Assert
    expect(mockStripe.accounts.create).toHaveBeenCalledWith({
      controller: {
        losses: {
          payments: "application"
        },
        fees: {
          payer: "application"
        },
        stripe_dashboard: {
          type: "express"
        }
      }
    })

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: {
        id: mockRequest.auth.user.id
      },
      data: {
        connectedStripeAccountId: mockAccountId
      }
    })

    expect(mockStripe.accountLinks.create).toHaveBeenCalledWith({
      account: mockAccountId,
      refresh_url: `${process.env.HOST_URL}/dashboard`,
      return_url: `${process.env.HOST_URL}/dashboard`,
      type: 'account_onboarding',
    })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { url: mockAccountLinkUrl },
      { status: 200 }
    )
  })

  it('deve retornar erro 400 quando criação da conta Stripe falha (sem ID)', async () => {
    mockStripe.accounts.create.mockResolvedValue({
      id: null, 
    })

    const { POST } = await import('./route')
    const response = await POST(mockRequest as any, { params: {} } as any)

    expect(mockStripe.accounts.create).toHaveBeenCalled()
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
    expect(mockStripe.accountLinks.create).not.toHaveBeenCalled()

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Falha ao criar conta de pagamento' },
      { status: 400 }
    )
  })

  it('deve retornar erro 500 quando Stripe accounts.create lança exceção', async () => {
    const stripeError = new Error('Stripe API Error')
    mockStripe.accounts.create.mockRejectedValue(stripeError)

    const { POST } = await import('./route')
    const response = await POST(mockRequest as any, { params: {} } as any)

    expect(mockStripe.accounts.create).toHaveBeenCalled()
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
    expect(mockStripe.accountLinks.create).not.toHaveBeenCalled()

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Falha ao criar conta' },
      { status: 500 }
    )
  })

  it('deve retornar erro 500 quando atualização do usuário no banco falha', async () => {
    const mockAccountId = `acct_${mockData.alphanumeric(16)}`
    const databaseError = new Error('Database connection error')

    mockStripe.accounts.create.mockResolvedValue({
      id: mockAccountId,
    })

    mockPrisma.user.update.mockRejectedValue(databaseError)

    const { POST } = await import('./route')
    const response = await POST(mockRequest as any, { params: {} } as any)

    expect(mockStripe.accounts.create).toHaveBeenCalled()
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: {
        id: mockRequest.auth.user.id
      },
      data: {
        connectedStripeAccountId: mockAccountId
      }
    })
    expect(mockStripe.accountLinks.create).not.toHaveBeenCalled()

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Falha ao criar conta' },
      { status: 500 }
    )
  })

  it('deve retornar erro 500 quando criação do account link falha', async () => {
    const mockAccountId = `acct_${mockData.alphanumeric(16)}`
    const accountLinkError = new Error('Account link creation failed')

    mockStripe.accounts.create.mockResolvedValue({
      id: mockAccountId,
    })

    mockPrisma.user.update.mockResolvedValue({
      id: mockRequest.auth.user.id,
      connectedStripeAccountId: mockAccountId,
    })

    mockStripe.accountLinks.create.mockRejectedValue(accountLinkError)

    const { POST } = await import('./route')
    const response = await POST(mockRequest as any, { params: {} } as any)

    expect(mockStripe.accounts.create).toHaveBeenCalled()
    expect(mockPrisma.user.update).toHaveBeenCalled()
    expect(mockStripe.accountLinks.create).toHaveBeenCalledWith({
      account: mockAccountId,
      refresh_url: `${process.env.HOST_URL}/dashboard`,
      return_url: `${process.env.HOST_URL}/dashboard`,
      type: 'account_onboarding',
    })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Falha ao criar conta' },
      { status: 500 }
    )
  })

  it('deve validar estrutura correta da configuração do controller do Stripe', async () => {
    // Arrange
    const mockAccountId = `acct_${mockData.alphanumeric(16)}`

    mockStripe.accounts.create.mockResolvedValue({
      id: mockAccountId,
    })

    mockStripe.accountLinks.create.mockResolvedValue({
      url: mockData.url(),
    })

    mockPrisma.user.update.mockResolvedValue({})

    // Act
    const { POST } = await import('./route')
    const response = await POST(mockRequest as any, { params: {} } as any)

    // Assert
    const expectedControllerConfig = {
      controller: {
        losses: {
          payments: "application"
        },
        fees: {
          payer: "application"
        },
        stripe_dashboard: {
          type: "express"
        }
      }
    }

    expect(mockStripe.accounts.create).toHaveBeenCalledWith(expectedControllerConfig)
  })
})
