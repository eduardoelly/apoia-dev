import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { vi } from 'vitest'
import { faker } from '@faker-js/faker'

// Mock do stripe
const mockStripe = {
  webhooks: {
    constructEvent: vi.fn(),
  },
  paymentIntents: {
    retrieve: vi.fn(),
  },
}
vi.mock('@/lib/stripe', () => ({
  stripe: mockStripe,
}))

// Mock do prisma
const mockPrisma = {
  donation: {
    update: vi.fn(),
  },
}
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock do NextResponse
class MockNextResponse {
  constructor(body: any, init?: ResponseInit) {
    this.body = body
    this.status = init?.status || 200
    this.statusText = init?.statusText || 'OK'
    Object.assign(this, init)
  }

  static json = vi.fn((data: any, options?: { status?: number }) => ({
    json: () => Promise.resolve(data),
    status: options?.status || 200,
    ...data,
    ...options,
  }))

  body: any
  status: number
  statusText: string
}

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: MockNextResponse,
}))

// Mock do console.log para evitar poluição nos testes
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

// Mock do process.env
const originalEnv = process.env

beforeAll(() => {
  process.env = {
    ...originalEnv,
    STRIPE_WEBHOOK_SECRET: faker.string.alphanumeric(32),
  }
})

afterAll(() => {
  process.env = originalEnv
  consoleSpy.mockRestore()
})

describe('API /stripe/webhook', () => {
  let mockRequest: NextRequest
  let mockHeaders: Headers
  let mockPayload: string

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockPayload = JSON.stringify({
      id: faker.string.alphanumeric(24),
      object: 'event',
      type: 'checkout.session.completed',
      data: {},
    })

    mockHeaders = new Headers({
      'stripe-signature': faker.string.alphanumeric(64),
      'content-type': 'application/json',
    })

    mockRequest = {
      headers: {
        get: vi.fn((name: string) => {
          if (name === 'stripe-signature') {
            return faker.string.alphanumeric(64)
          }
          return null
        }),
      },
      text: vi.fn().mockResolvedValue(mockPayload),
    } as unknown as NextRequest
  })

  describe('POST /api/stripe/webhook', () => {
    it('deve retornar erro 400 quando assinatura Stripe é inválida', async () => {
      const webhookError = new Error('Invalid signature')
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw webhookError
      })

      const { POST } = await import('./route')
      const response = await POST(mockRequest)

      expect(response).toBeInstanceOf(MockNextResponse)
      expect(response.status).toBe(400)
    })

    it('deve processar evento checkout.session.completed com sucesso', async () => {
      const donationId = faker.string.uuid()
      const donorName = faker.person.fullName()
      const donorMessage = faker.lorem.sentence()
      const paymentIntentId = faker.string.alphanumeric(24)

      const mockEvent: Stripe.Event = {
        id: faker.string.alphanumeric(24),
        object: 'event',
        api_version: '2023-10-16',
        created: faker.date.recent().getTime(),
        data: {
          object: {
            id: faker.string.alphanumeric(24),
            object: 'checkout.session',
            payment_intent: paymentIntentId,
            payment_status: 'paid',
            status: 'complete',
          } as Stripe.Checkout.Session,
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: faker.string.alphanumeric(24),
          idempotency_key: faker.string.alphanumeric(24),
        },
        type: 'checkout.session.completed',
      }

      const mockPaymentIntent = {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: faker.number.int({ min: 500, max: 10000 }),
        currency: 'brl',
        metadata: {
          donationId,
          donorName,
          donorMessage,
        },
        status: 'succeeded',
      } as unknown as Stripe.PaymentIntent

      const mockUpdatedDonation = {
        id: donationId,
        amount: mockPaymentIntent.amount,
        staus: 'PAID',
        donorName,
        donorMessage,
        createdAt: faker.date.recent(),
        updatedAt: new Date(),
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent)
      mockPrisma.donation.update.mockResolvedValue(mockUpdatedDonation)

      const { POST } = await import('./route')
      const response = await POST(mockRequest)

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        mockPayload,
        expect.any(String),
        process.env.STRIPE_WEBHOOK_SECRET
      )

      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith(paymentIntentId)

      expect(mockPrisma.donation.update).toHaveBeenCalledWith({
        where: {
          id: donationId,
        },
        data: {
          staus: 'PAID',
          donorName,
          donorMessage,
        },
      })

      expect(MockNextResponse.json).toHaveBeenCalledWith({ ok: true })
    })

    it('deve usar valores padrão quando metadata está ausente', async () => {
      const paymentIntentId = faker.string.alphanumeric(24)
      const donationId = faker.string.uuid()

      const mockEvent: Stripe.Event = {
        id: faker.string.alphanumeric(24),
        object: 'event',
        api_version: '2023-10-16',
        created: faker.date.recent().getTime(),
        data: {
          object: {
            id: faker.string.alphanumeric(24),
            object: 'checkout.session',
            payment_intent: paymentIntentId,
          } as Stripe.Checkout.Session,
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: faker.string.alphanumeric(24),
          idempotency_key: faker.string.alphanumeric(24),
        },
        type: 'checkout.session.completed',
      }

      const mockPaymentIntent = {
        id: paymentIntentId,
        object: 'payment_intent',
        metadata: {
          donationId,
          // donorName e donorMessage ausentes
        },
      } as unknown as Stripe.PaymentIntent

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent)
      mockPrisma.donation.update.mockResolvedValue({})

      const { POST } = await import('./route')
      await POST(mockRequest)

      expect(mockPrisma.donation.update).toHaveBeenCalledWith({
        where: {
          id: donationId,
        },
        data: {
          staus: 'PAID',
          donorName: 'Anônimo',
          donorMessage: 'Sem mensagem',
        },
      })
    })

    it('deve usar valores padrão quando metadata é null', async () => {
      const paymentIntentId = faker.string.alphanumeric(24)
      const donationId = faker.string.uuid()

      const mockEvent: Stripe.Event = {
        id: faker.string.alphanumeric(24),
        object: 'event',
        api_version: '2023-10-16',
        created: faker.date.recent().getTime(),
        data: {
          object: {
            id: faker.string.alphanumeric(24),
            object: 'checkout.session',
            payment_intent: paymentIntentId,
          } as Stripe.Checkout.Session,
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: faker.string.alphanumeric(24),
          idempotency_key: faker.string.alphanumeric(24),
        },
        type: 'checkout.session.completed',
      }

      const mockPaymentIntent = {
        id: paymentIntentId,
        object: 'payment_intent',
        metadata: {
          donationId,
          donorName: null,
          donorMessage: null,
        },
      } as unknown as Stripe.PaymentIntent

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent)
      mockPrisma.donation.update.mockResolvedValue({})

      const { POST } = await import('./route')
      await POST(mockRequest)

      expect(mockPrisma.donation.update).toHaveBeenCalledWith({
        where: {
          id: donationId,
        },
        data: {
          staus: 'PAID',
          donorName: 'Anônimo',
          donorMessage: 'Sem mensagem',
        },
      })
    })

    it('deve extrair corretamente payment_intent do session', async () => {
      const paymentIntentId = faker.string.alphanumeric(24)
      const donationId = faker.string.uuid()

      const mockEvent: Stripe.Event = {
        id: faker.string.alphanumeric(24),
        object: 'event',
        api_version: '2023-10-16',
        created: faker.date.recent().getTime(),
        data: {
          object: {
            id: faker.string.alphanumeric(24),
            object: 'checkout.session',
            payment_intent: paymentIntentId,
            payment_status: 'paid',
          } as Stripe.Checkout.Session,
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: faker.string.alphanumeric(24),
          idempotency_key: faker.string.alphanumeric(24),
        },
        type: 'checkout.session.completed',
      }

      const mockPaymentIntent = {
        id: paymentIntentId,
        object: 'payment_intent',
        metadata: { donationId },
      } as unknown as Stripe.PaymentIntent

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent)
      mockPrisma.donation.update.mockResolvedValue({})

      const { POST } = await import('./route')
      await POST(mockRequest)

      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith(paymentIntentId)
    })

    it('deve processar múltiplos webhooks em sequência', async () => {
      const requests = Array.from({ length: 3 }, (_, index) => {
        const paymentIntentId = faker.string.alphanumeric(24)
        const donationId = faker.string.uuid()

        return {
          mockEvent: {
            id: faker.string.alphanumeric(24),
            object: 'event',
            type: 'checkout.session.completed',
            data: {
              object: {
                payment_intent: paymentIntentId,
              } as Stripe.Checkout.Session,
            },
          } as Stripe.Event,
          mockPaymentIntent: {
            metadata: {
              donationId,
              donorName: faker.person.fullName(),
              donorMessage: faker.lorem.sentence(),
            },
          } as unknown as Stripe.PaymentIntent,
          donationId,
        }
      })

      const { POST } = await import('./route')

      for (const { mockEvent, mockPaymentIntent, donationId } of requests) {
        mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
        mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent)
        mockPrisma.donation.update.mockResolvedValue({ id: donationId })

        const response = await POST(mockRequest)
        expect(MockNextResponse.json).toHaveBeenCalledWith({ ok: true })
      }

      expect(mockPrisma.donation.update).toHaveBeenCalledTimes(3)
    })

    it('deve validar assinatura do webhook com endpoint secret correto', async () => {
      const mockEvent: Stripe.Event = {
        id: faker.string.alphanumeric(24),
        object: 'event',
        api_version: '2023-10-16',
        created: faker.date.recent().getTime(),
        data: { object: {} as any },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: faker.string.alphanumeric(24),
          idempotency_key: faker.string.alphanumeric(24),
        },
        type: 'payment_intent.created',
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

      const { POST } = await import('./route')
      await POST(mockRequest)

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        mockPayload,
        expect.any(String),
        process.env.STRIPE_WEBHOOK_SECRET
      )
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve lidar com erro na recuperação do payment intent', async () => {
      const paymentIntentId = faker.string.alphanumeric(24)

      const mockEvent: Stripe.Event = {
        id: faker.string.alphanumeric(24),
        object: 'event',
        api_version: '2023-10-16',
        created: faker.date.recent().getTime(),
        data: {
          object: {
            payment_intent: paymentIntentId,
          } as Stripe.Checkout.Session,
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: faker.string.alphanumeric(24),
          idempotency_key: faker.string.alphanumeric(24),
        },
        type: 'checkout.session.completed',
      }

      const stripeError = new Error('Payment intent not found')
      
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockStripe.paymentIntents.retrieve.mockRejectedValue(stripeError)

      const { POST } = await import('./route')
      
      // Deve ainda retornar sucesso mesmo com erro interno
      const response = await POST(mockRequest)
      expect(console.log).toHaveBeenCalledWith('## ERROR retrieving payment intent', stripeError)
      expect(MockNextResponse.json).toHaveBeenCalledWith({ ok: true })
    })

    it('deve garantir que prisma.donation.update não seja chamado quando há erro na recuperação do payment intent', async () => {
      const paymentIntentId = faker.string.alphanumeric(24)

      const mockEvent: Stripe.Event = {
        id: faker.string.alphanumeric(24),
        object: 'event',
        api_version: '2023-10-16',
        created: faker.date.recent().getTime(),
        data: {
          object: {
            payment_intent: paymentIntentId,
          } as Stripe.Checkout.Session,
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: faker.string.alphanumeric(24),
          idempotency_key: faker.string.alphanumeric(24),
        },
        type: 'checkout.session.completed',
      }

      const stripeError = new Error('Payment intent not found')
      
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockStripe.paymentIntents.retrieve.mockRejectedValue(stripeError)

      const { POST } = await import('./route')
      await POST(mockRequest)
      
      // Não deve tentar atualizar a doação se não conseguir recuperar o payment intent
      expect(mockPrisma.donation.update).not.toHaveBeenCalled()
    })

    it('deve lidar com diferentes tipos de erro do Stripe webhook', async () => {
      const stripeErrors = [
        { name: 'StripeSignatureVerificationError', message: 'Invalid signature' },
        { name: 'StripeError', message: 'General Stripe error' },
        { name: 'Error', message: 'Generic error' },
      ]

      for (const errorInfo of stripeErrors) {
        const error = new Error(errorInfo.message)
        error.name = errorInfo.name
        
        mockStripe.webhooks.constructEvent.mockImplementation(() => {
          throw error
        })

        const { POST } = await import('./route')
        const response = await POST(mockRequest)

        expect(response).toBeInstanceOf(MockNextResponse)
        expect(response.status).toBe(400)
      }
    })
  })

  describe('Validação de Dados', () => {
    it('deve lidar com payment_intent como objeto em vez de string', async () => {
      const paymentIntentObject = {
        id: faker.string.alphanumeric(24),
        object: 'payment_intent',
      }

      const mockEvent: Stripe.Event = {
        id: faker.string.alphanumeric(24),
        object: 'event',
        api_version: '2023-10-16',
        created: faker.date.recent().getTime(),
        data: {
          object: {
            payment_intent: paymentIntentObject,
          } as unknown as Stripe.Checkout.Session,
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: faker.string.alphanumeric(24),
          idempotency_key: faker.string.alphanumeric(24),
        },
        type: 'checkout.session.completed',
      }

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        metadata: { donationId: faker.string.uuid() },
      } as unknown as Stripe.PaymentIntent)
      mockPrisma.donation.update.mockResolvedValue({})

      const { POST } = await import('./route')
      await POST(mockRequest)

      // Deve tentar usar o objeto como string
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith(paymentIntentObject)
    })

    it('deve processar metadata com caracteres especiais', async () => {
      const donationId = faker.string.uuid()
      const donorName = 'José da Silva & Cia. Ltda.'
      const donorMessage = 'Mensagem com "aspas" e \'apostrofes\' e acentos: ção, não, ã'

      const mockEvent: Stripe.Event = {
        id: faker.string.alphanumeric(24),
        object: 'event',
        api_version: '2023-10-16',
        created: faker.date.recent().getTime(),
        data: {
          object: {
            payment_intent: faker.string.alphanumeric(24),
          } as Stripe.Checkout.Session,
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: faker.string.alphanumeric(24),
          idempotency_key: faker.string.alphanumeric(24),
        },
        type: 'checkout.session.completed',
      }

      const mockPaymentIntent = {
        metadata: {
          donationId,
          donorName,
          donorMessage,
        },
      } as unknown as Stripe.PaymentIntent

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent)
      mockPrisma.donation.update.mockResolvedValue({})

      const { POST } = await import('./route')
      await POST(mockRequest)

      expect(mockPrisma.donation.update).toHaveBeenCalledWith({
        where: { id: donationId },
        data: {
          staus: 'PAID',
          donorName,
          donorMessage,
        },
      })
    })
  })
})