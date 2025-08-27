import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { getLoginOnboardAccount } from './create-onboard-account'

// Mock do stripe
vi.mock('@/lib/stripe', () => ({
  stripe: {
    accountLinks: {
      create: vi.fn(),
    },
  },
}))

import { stripe } from '@/lib/stripe'

const mockStripe = stripe as any

describe('getLoginOnboardAccount', () => {
  const mockData = {
    accountId: () => faker.string.alphanumeric(21),
    url: () => faker.internet.url(),
    hostUrl: () => faker.internet.url(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.HOST_URL = mockData.hostUrl()
  })

  afterEach(() => {
    delete process.env.HOST_URL
  })

  describe('Validação de Parâmetros', () => {
    it('deve retornar null quando accountId é undefined', async () => {
      const result = await getLoginOnboardAccount(undefined)

      expect(result).toBeNull()
      expect(mockStripe.accountLinks.create).not.toHaveBeenCalled()
    })

    it('deve retornar null quando accountId é string vazia', async () => {
      const result = await getLoginOnboardAccount('')
      expect(result).toBeNull()
      expect(mockStripe.accountLinks.create).not.toHaveBeenCalled()
    })

    it('deve retornar null quando accountId é null', async () => {
      const result = await getLoginOnboardAccount(null as any)
      expect(result).toBeNull()
      expect(mockStripe.accountLinks.create).not.toHaveBeenCalled()
    })
  })

  describe('Criação de Account Link', () => {
    it('deve criar account link com parâmetros corretos', async () => {
      const accountId = mockData.accountId()
      const expectedUrl = mockData.url()
      const hostUrl = process.env.HOST_URL
      mockStripe.accountLinks.create.mockResolvedValue({ url: expectedUrl })
      const result = await getLoginOnboardAccount(accountId)

      expect(mockStripe.accountLinks.create).toHaveBeenCalledWith({
        account: accountId,
        refresh_url: `${hostUrl}/dashboard`,
        return_url: `${hostUrl}/dashboard`,
        type: 'account_onboarding',
      })
      expect(result).toBe(expectedUrl)
    })

    it('deve retornar URL do account link quando criado com sucesso', async () => {
      const accountId = mockData.accountId()
      const expectedUrl = mockData.url()
      mockStripe.accountLinks.create.mockResolvedValue({ url: expectedUrl })
      const result = await getLoginOnboardAccount(accountId)

      expect(result).toBe(expectedUrl)
    })

    it('deve usar HOST_URL do environment corretamente', async () => {
      const accountId = mockData.accountId()
      const customHostUrl = 'https://custom-domain.com'
      process.env.HOST_URL = customHostUrl
      mockStripe.accountLinks.create.mockResolvedValue({ url: mockData.url() })
      await getLoginOnboardAccount(accountId)

      expect(mockStripe.accountLinks.create).toHaveBeenCalledWith({
        account: accountId,
        refresh_url: `${customHostUrl}/dashboard`,
        return_url: `${customHostUrl}/dashboard`,
        type: 'account_onboarding',
      })
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve retornar null quando stripe lança erro', async () => {
      const accountId = mockData.accountId()
      mockStripe.accountLinks.create.mockRejectedValue(new Error('Stripe API error'))
      const result = await getLoginOnboardAccount(accountId)

      expect(result).toBeNull()
    })

    it('deve retornar null quando stripe lança erro de conta inválida', async () => {
      const accountId = 'invalid-account-id'
      mockStripe.accountLinks.create.mockRejectedValue(new Error('No such account'))
      const result = await getLoginOnboardAccount(accountId)

      expect(result).toBeNull()
    })

    it('deve retornar null quando stripe retorna erro de timeout', async () => {
      const accountId = mockData.accountId()
      mockStripe.accountLinks.create.mockRejectedValue(new Error('Request timeout'))
      const result = await getLoginOnboardAccount(accountId)

      expect(result).toBeNull()
    })

    it('deve retornar null quando stripe retorna erro de rede', async () => {
      const accountId = mockData.accountId()
      mockStripe.accountLinks.create.mockRejectedValue(new Error('Network error'))
      const result = await getLoginOnboardAccount(accountId)
      expect(result).toBeNull()
    })
  })

  describe('Casos Edge', () => {
    it('deve lidar com accountId muito longo', async () => {
      const longAccountId = faker.string.alphanumeric(200)
      const expectedUrl = mockData.url()
      mockStripe.accountLinks.create.mockResolvedValue({ url: expectedUrl })
      const result = await getLoginOnboardAccount(longAccountId)

      expect(mockStripe.accountLinks.create).toHaveBeenCalledWith({
        account: longAccountId,
        refresh_url: `${process.env.HOST_URL}/dashboard`,
        return_url: `${process.env.HOST_URL}/dashboard`,
        type: 'account_onboarding',
      })
      expect(result).toBe(expectedUrl)
    })

    it('deve lidar com accountId com caracteres especiais', async () => {
      const specialAccountId = 'acct_1234567890ABCDEF'
      const expectedUrl = mockData.url()
      mockStripe.accountLinks.create.mockResolvedValue({ url: expectedUrl })
      const result = await getLoginOnboardAccount(specialAccountId)
      expect(result).toBe(expectedUrl)
    })

    it('deve lidar com URL de resposta do Stripe muito longa', async () => {
      const accountId = mockData.accountId()
      const longUrl = `https://connect.stripe.com/setup/e/${faker.string.alphanumeric(500)}`
      mockStripe.accountLinks.create.mockResolvedValue({ url: longUrl })
      const result = await getLoginOnboardAccount(accountId)
      expect(result).toBe(longUrl)
    })

    it('deve lidar com HOST_URL não definida', async () => {
      const accountId = mockData.accountId()
      delete process.env.HOST_URL
      mockStripe.accountLinks.create.mockResolvedValue({ url: mockData.url() })
      await getLoginOnboardAccount(accountId)
      expect(mockStripe.accountLinks.create).toHaveBeenCalledWith({
        account: accountId,
        refresh_url: 'undefined/dashboard',
        return_url: 'undefined/dashboard',
        type: 'account_onboarding',
      })
    })
  })
})
