"use server"

import { createPayment } from '../create-payment'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { vi } from 'vitest'
import { validPaymentData, mockCreator, mockStripeSession, mockDonation } from '@/mocks'

// Mock do Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    donation: {
      create: vi.fn(),
    },
  },
}))

// Mock do Stripe
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}))

// Mocks tipados
const mockPrismaUserFindFirst = prisma.user.findFirst as any
const mockPrismaDonationCreate = prisma.donation.create as any
const mockStripeSessionCreate = stripe.checkout.sessions.create as any

describe('createPayment', () => {
  // Mock de variáveis de ambiente
  const originalHostUrl = process.env.HOST_URL

  beforeAll(() => {
    process.env.HOST_URL = 'http://localhost:3000'
  })

  afterAll(() => {
    if (originalHostUrl !== undefined) {
      process.env.HOST_URL = originalHostUrl
    } else {
      delete process.env.HOST_URL
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validação de Schema', () => {
    it('deve retornar erro quando slug estiver vazio', async () => {
      const invalidData = { ...validPaymentData, slug: '' }
      
      const result = await createPayment(invalidData)
      
      expect(result).toEqual({
        error: 'Slug do creator é obrigatório'
      })
    })

    it('deve retornar erro quando nome estiver vazio', async () => {
      const invalidData = { ...validPaymentData, name: '' }
      
      const result = await createPayment(invalidData)
      
      expect(result).toEqual({
        error: 'O nome precisa ter pelo menos 1 letra'
      })
    })

    it('deve retornar erro quando mensagem for muito curta', async () => {
      const invalidData = { ...validPaymentData, message: 'Oi' }
      
      const result = await createPayment(invalidData)
      
      expect(result).toEqual({
        error: 'A mensagem precisa ter pelo menos 5 letras'
      })
    })

    it('deve retornar erro quando preço for menor que R$15', async () => {
      const invalidData = { ...validPaymentData, price: 1000 } // R$ 10,00
      
      const result = await createPayment(invalidData)
      
      expect(result).toEqual({
        error: 'Selecione m valor maior que R$15'
      })
    })

    it('deve retornar erro quando creatorId estiver vazio', async () => {
      const invalidData = { ...validPaymentData, creatorId: '' }
      
      const result = await createPayment(invalidData)
      
      expect(result).toEqual({
        error: 'Falha ao criar pagamento, tente novamente.'
      })
    })
  })

  describe('Validação de Creator', () => {
    it('deve retornar erro quando creator não for encontrado', async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null)
      
      const result = await createPayment(validPaymentData)
      
      expect(result).toEqual({
        error: 'Falha ao criar pagamento, tente novamente.'
      })
      expect(mockPrismaUserFindFirst).toHaveBeenCalledWith({
        where: {
          connectedStripeAccountId: validPaymentData.creatorId
        }
      })
    })
  })

  describe('Cálculo de Taxa e Criação de Doação', () => {
    it('deve calcular corretamente a taxa de 10% da aplicação', async () => {
      mockPrismaUserFindFirst.mockResolvedValue(mockCreator as any)
      mockPrismaDonationCreate.mockResolvedValue(mockDonation as any)
      mockStripeSessionCreate.mockResolvedValue(mockStripeSession as any)
      
      await createPayment(validPaymentData)
      
      // Verifica se a doação foi criada com o valor correto (descontando 10% de taxa)
      const expectedAmount = validPaymentData.price - Math.floor(validPaymentData.price * 0.1)
      expect(mockPrismaDonationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          donorName: validPaymentData.name,
          donorMessage: validPaymentData.message,
          userId: mockCreator.id,
          staus: 'PENDING',
          amount: expectedAmount
        })
      })
    })

    it('deve calcular taxa corretamente para valores diferentes', async () => {
      const testCases = [
        { price: 1500, expectedFee: 150, expectedAmount: 1350 }, // R$ 15,00
        { price: 5000, expectedFee: 500, expectedAmount: 4500 }, // R$ 50,00
        { price: 10000, expectedFee: 1000, expectedAmount: 9000 }, // R$ 100,00
      ]

      for (const testCase of testCases) {
        vi.clearAllMocks()
        mockPrismaUserFindFirst.mockResolvedValue(mockCreator as any)
        mockPrismaDonationCreate.mockResolvedValue(mockDonation as any)
        mockStripeSessionCreate.mockResolvedValue(mockStripeSession as any)

        const data = { ...validPaymentData, price: testCase.price }
        await createPayment(data)

        expect(mockPrismaDonationCreate).toHaveBeenCalledWith({
          data: {
            donorName: validPaymentData.name,
            donorMessage: validPaymentData.message,
            userId: mockCreator.id,
            staus: 'PENDING',
            amount: testCase.expectedAmount
          }
        })
      }
    })
  })

  describe('Criação de Sessão Stripe', () => {
    beforeEach(() => {
      mockPrismaUserFindFirst.mockResolvedValue(mockCreator as any)
      mockPrismaDonationCreate.mockResolvedValue(mockDonation as any)
    })

    it('deve criar sessão Stripe com parâmetros corretos', async () => {
      mockStripeSessionCreate.mockResolvedValue(mockStripeSession as any)
      
      await createPayment(validPaymentData)
      
      const expectedApplicationFee = Math.floor(validPaymentData.price * 0.1)
      expect(mockStripeSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card'],
          mode: 'payment',
          success_url: `${process.env.HOST_URL}/creator/${validPaymentData.slug}`,
          cancel_url: `${process.env.HOST_URL}/creator/${validPaymentData.slug}`,
          line_items: [
            {
              price_data: {
                currency: 'brl',
                product_data: {
                  name: 'Apoiar ' + mockCreator.name
                },
                unit_amount: validPaymentData.price,
              },
              quantity: 1
            }
          ],
          payment_intent_data: expect.objectContaining({
            application_fee_amount: expectedApplicationFee,
            transfer_data: {
              destination: expect.any(String)
            },
            metadata: expect.objectContaining({
              donorName: validPaymentData.name,
              donorMessage: validPaymentData.message
            })
          })
        })
      )
    })

    it('deve retornar sessionId quando criado com sucesso', async () => {
      mockStripeSessionCreate.mockResolvedValue(mockStripeSession as any)
      
      const result = await createPayment(validPaymentData)
      
      expect(result).toEqual({
        sessionId: mockStripeSession.id
      })
    })
  })

  describe('Tratamento de Erros', () => {
    beforeEach(() => {
      mockPrismaUserFindFirst.mockResolvedValue(mockCreator as any)
    })

    it('deve retornar erro quando falha na criação da doação', async () => {
      mockPrismaDonationCreate.mockRejectedValue(new Error('Database error'))
      
      const result = await createPayment(validPaymentData)
      
      expect(result).toEqual({
        error: 'Falha ao criar pagamento, tente novamente.'
      })
    })

    it('deve retornar erro quando falha na criação da sessão Stripe', async () => {
      mockPrismaDonationCreate.mockResolvedValue(mockDonation as any)
      mockStripeSessionCreate.mockRejectedValue(new Error('Stripe error'))
      
      const result = await createPayment(validPaymentData)
      
      expect(result).toEqual({
        error: 'Falha ao criar pagamento, tente novamente.'
      })
    })

    it('deve retornar erro quando Prisma user.findFirst falha', async () => {
      mockPrismaUserFindFirst.mockRejectedValue(new Error('Database connection error'))
      
      const result = await createPayment(validPaymentData)
      
      expect(result).toEqual({
        error: 'Falha ao criar pagamento, tente novamente.'
      })
    })
  })

  describe('Fluxo Completo de Sucesso', () => {
    it('deve executar fluxo completo com sucesso', async () => {
      // Setup dos mocks
      mockPrismaUserFindFirst.mockResolvedValue(mockCreator as any)
      mockPrismaDonationCreate.mockResolvedValue(mockDonation as any)
      mockStripeSessionCreate.mockResolvedValue(mockStripeSession as any)
      
      const result = await createPayment(validPaymentData)
      
      // Verifica se todos os métodos foram chamados na ordem correta
      expect(mockPrismaUserFindFirst).toHaveBeenCalledTimes(1)
      expect(mockPrismaDonationCreate).toHaveBeenCalledTimes(1)
      expect(mockStripeSessionCreate).toHaveBeenCalledTimes(1)
      
      // Verifica se o resultado final está correto
      expect(result).toEqual({
        sessionId: mockStripeSession.id
      })
    })
  })

  describe('Casos Edge', () => {
    it('deve lidar com valores de preço extremos corretamente', async () => {
      mockPrismaUserFindFirst.mockResolvedValue(mockCreator as any)
      mockPrismaDonationCreate.mockResolvedValue(mockDonation as any)
      mockStripeSessionCreate.mockResolvedValue(mockStripeSession as any)
      
      // Valor mínimo permitido
      const minData = { ...validPaymentData, price: 1500 }
      await createPayment(minData)
      
      const expectedMinAmount = 1500 - Math.round(1500 * 0.1) // 1350
      expect(mockPrismaDonationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: expectedMinAmount
        })
      })
    })

    it('deve lidar com nomes e mensagens com caracteres especiais', async () => {
      mockPrismaUserFindFirst.mockResolvedValue(mockCreator as any)
      mockPrismaDonationCreate.mockResolvedValue(mockDonation as any)
      mockStripeSessionCreate.mockResolvedValue(mockStripeSession as any)
      
      const specialData = {
        ...validPaymentData,
        name: 'José da Silva Ção',
        message: 'Obrigado! Você é ótimo! 👏🎉'
      }
      
      const result = await createPayment(specialData)
      
      expect(result).toEqual({
        sessionId: mockStripeSession.id
      })
      
      expect(mockStripeSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent_data: expect.objectContaining({
            metadata: expect.objectContaining({
              donorName: specialData.name,
              donorMessage: specialData.message,
            })
          })
        })
      )
    })

    it('deve lidar com creatorId que não corresponde a nenhum usuário', async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null)
      
      const invalidCreatorData = { ...validPaymentData, creatorId: 'acct_inexistente' }
      const result = await createPayment(invalidCreatorData)
      
      expect(result).toEqual({
        error: 'Falha ao criar pagamento, tente novamente.'
      })
      
      // Verifica que os outros métodos não foram chamados
      expect(mockPrismaDonationCreate).not.toHaveBeenCalled()
      expect(mockStripeSessionCreate).not.toHaveBeenCalled()
    })
  })
})
