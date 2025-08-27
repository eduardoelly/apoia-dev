import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { getStripeDashboard } from './get-stripe-dashboard'

// Mock do stripe
vi.mock('@/lib/stripe', () => ({
  stripe: {
    accounts: {
      createLoginLink: vi.fn(),
    },
  },
}))

import { stripe } from '@/lib/stripe'

const mockStripe = stripe as any

describe('getStripeDashboard', () => {
  const mockData = {
    accountId: () => faker.string.alphanumeric(21),
    loginUrl: () => faker.internet.url(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validação de Parâmetros', () => {
    it('deve retornar null quando accontId é undefined', async () => {
      const result = await getStripeDashboard(undefined)
      expect(result).toBeNull()
      expect(mockStripe.accounts.createLoginLink).not.toHaveBeenCalled()
    })

    it('deve retornar null quando accontId é string vazia', async () => {
      const result = await getStripeDashboard('')
      expect(result).toBeNull()
      expect(mockStripe.accounts.createLoginLink).not.toHaveBeenCalled()
    })

    it('deve retornar null quando accontId é null', async () => {
      const result = await getStripeDashboard(null as any)
      expect(result).toBeNull()
      expect(mockStripe.accounts.createLoginLink).not.toHaveBeenCalled()
    })
  })

  describe('Criação de Login Link', () => {
    it('deve criar login link com accountId correto', async () => {
      const accountId = mockData.accountId()
      const expectedUrl = mockData.loginUrl()
      mockStripe.accounts.createLoginLink.mockResolvedValue({ url: expectedUrl })
      const result = await getStripeDashboard(accountId)
      expect(mockStripe.accounts.createLoginLink).toHaveBeenCalledWith(accountId)
      expect(result).toBe(expectedUrl)
    })

    it('deve retornar URL do login link quando criado com sucesso', async () => {
      const accountId = mockData.accountId()
      const expectedUrl = mockData.loginUrl()
      mockStripe.accounts.createLoginLink.mockResolvedValue({ url: expectedUrl })
      const result = await getStripeDashboard(accountId)
      expect(result).toBe(expectedUrl)
    })

    it('deve lidar com accountId válido do Stripe', async () => {
      const stripeAccountId = 'acct_1234567890ABCDEF'
      const expectedUrl = mockData.loginUrl()
      mockStripe.accounts.createLoginLink.mockResolvedValue({ url: expectedUrl })
      const result = await getStripeDashboard(stripeAccountId)
      expect(mockStripe.accounts.createLoginLink).toHaveBeenCalledWith(stripeAccountId)
      expect(result).toBe(expectedUrl)
    })

    it('deve preservar URL completa retornada pelo Stripe', async () => {
      const accountId = mockData.accountId()
      const fullStripeUrl = 'https://connect.stripe.com/express/oauth/authorize?client_id=ca_123&stripe_user[email]=test@example.com'
      mockStripe.accounts.createLoginLink.mockResolvedValue({ url: fullStripeUrl })
      const result = await getStripeDashboard(accountId)
      expect(result).toBe(fullStripeUrl)
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve retornar null quando stripe lança erro', async () => {
      const accountId = mockData.accountId()
      mockStripe.accounts.createLoginLink.mockRejectedValue(new Error('Stripe API error'))
      const result = await getStripeDashboard(accountId)
      expect(result).toBeNull()
    })

    it('deve retornar null quando conta não existe', async () => {
      const accountId = 'invalid-account-id'
      mockStripe.accounts.createLoginLink.mockRejectedValue(new Error('No such account'))
      const result = await getStripeDashboard(accountId)
      expect(result).toBeNull()
    })

    it('deve retornar null quando há erro de autenticação', async () => {
      const accountId = mockData.accountId()
      mockStripe.accounts.createLoginLink.mockRejectedValue(new Error('Invalid API key'))
      const result = await getStripeDashboard(accountId)
      expect(result).toBeNull()
    })

    it('deve retornar null quando há timeout na requisição', async () => {
      const accountId = mockData.accountId()
      mockStripe.accounts.createLoginLink.mockRejectedValue(new Error('Request timeout'))
      const result = await getStripeDashboard(accountId)
      expect(result).toBeNull()
    })

    it('deve retornar null quando há erro de rede', async () => {
      const accountId = mockData.accountId()
      mockStripe.accounts.createLoginLink.mockRejectedValue(new Error('Network error'))
      const result = await getStripeDashboard(accountId)
      expect(result).toBeNull()
    })

    it('deve retornar null quando conta está inativa', async () => {
      const accountId = mockData.accountId()
      mockStripe.accounts.createLoginLink.mockRejectedValue(new Error('Account not active'))
      const result = await getStripeDashboard(accountId)
      expect(result).toBeNull()
    })
  })

  describe('Casos Edge', () => {
    it('deve lidar com accountId muito longo', async () => {
      const longAccountId = faker.string.alphanumeric(200)
      const expectedUrl = mockData.loginUrl()
      mockStripe.accounts.createLoginLink.mockResolvedValue({ url: expectedUrl })
      const result = await getStripeDashboard(longAccountId)
      expect(mockStripe.accounts.createLoginLink).toHaveBeenCalledWith(longAccountId)
      expect(result).toBe(expectedUrl)
    })

    it('deve lidar com accountId com caracteres especiais válidos', async () => {
      const specialAccountId = 'acct_1234567890ABCDEF_special'
      const expectedUrl = mockData.loginUrl()
      mockStripe.accounts.createLoginLink.mockResolvedValue({ url: expectedUrl })
      const result = await getStripeDashboard(specialAccountId)
      expect(result).toBe(expectedUrl)
    })

    it('deve lidar com URL de login muito longa', async () => {
      const accountId = mockData.accountId()
      const longUrl = `https://connect.stripe.com/express/oauth/authorize?${faker.string.alphanumeric(500)}`
      mockStripe.accounts.createLoginLink.mockResolvedValue({ url: longUrl })
      const result = await getStripeDashboard(accountId)
      expect(result).toBe(longUrl)
    })

    it('deve lidar com resposta do Stripe com propriedades extras', async () => {
      const accountId = mockData.accountId()
      const expectedUrl = mockData.loginUrl()
      const stripeResponse = {
        url: expectedUrl,
        created: faker.date.recent().getTime(),
        object: 'login_link',
        extraProperty: 'should be ignored'
      }
      mockStripe.accounts.createLoginLink.mockResolvedValue(stripeResponse)
      const result = await getStripeDashboard(accountId)
      expect(result).toBe(expectedUrl)
    })

    it('deve preservar encoding de caracteres especiais na URL', async () => {
      const accountId = mockData.accountId()
      const urlWithSpecialChars = 'https://connect.stripe.com/express?param=value%20with%20spaces&other=test'
      mockStripe.accounts.createLoginLink.mockResolvedValue({ url: urlWithSpecialChars })
      const result = await getStripeDashboard(accountId)
      expect(result).toBe(urlWithSpecialChars)
    })

    it('deve lidar com diferentes formatos de accountId válidos', async () => {
      const accountIds = [
        'acct_1234567890',
        'acct_ABCDEFGHIJ',
        'acct_1A2B3C4D5E',
        'acct_' + faker.string.alphanumeric(16)
      ]
      const expectedUrl = mockData.loginUrl()
      for (const accountId of accountIds) {
        mockStripe.accounts.createLoginLink.mockResolvedValue({ url: expectedUrl })

        const result = await getStripeDashboard(accountId)
        expect(result).toBe(expectedUrl)
        expect(mockStripe.accounts.createLoginLink).toHaveBeenCalledWith(accountId)
      }
      expect(mockStripe.accounts.createLoginLink).toHaveBeenCalledTimes(accountIds.length)
    })

    it('deve lidar com resposta sem URL', async () => {
      const accountId = mockData.accountId()
      mockStripe.accounts.createLoginLink.mockResolvedValue({})
      const result = await getStripeDashboard(accountId)
      expect(result).toBeUndefined()
    })
  })
})
