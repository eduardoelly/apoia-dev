import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import FormDonate from './form-donate'

// Mock das dependências
vi.mock('../_actions/create-payment', () => ({
  createPayment: vi.fn(),
}))

vi.mock('@/lib/stripe-js', () => ({
  getStripeJs: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock dos componentes UI
vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: any) => <div data-testid="form">{children}</div>,
  FormControl: ({ children }: any) => <div data-testid="form-control">{children}</div>,
  FormField: ({ render }: any) => render({ field: { onChange: vi.fn(), value: '' } }),
  FormItem: ({ children }: any) => <div data-testid="form-item">{children}</div>,
  FormLabel: ({ children }: any) => <label data-testid="form-label">{children}</label>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input data-testid="input" {...props} />,
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea data-testid="textarea" {...props} />,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, ...props }: any) => (
    <button data-testid="button" disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, onValueChange, defaultValue }: any) => (
    <div data-testid="radio-group" data-default-value={defaultValue}>
      {children}
    </div>
  ),
  RadioGroupItem: ({ value, id }: any) => (
    <input type="radio" data-testid="radio-item" value={value} id={id} />
  ),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => (
    <label data-testid="label" htmlFor={htmlFor}>{children}</label>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h2 data-testid="card-title">{children}</h2>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
}))

// Mock do react-hook-form
const mockHandleSubmit = vi.fn()
const mockFormState = { isSubmitting: false }

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    handleSubmit: mockHandleSubmit,
    control: {},
    formState: mockFormState,
  }),
}))

// Mock do zodResolver
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(),
}))

import { createPayment } from '../_actions/create-payment'
import { getStripeJs } from '@/lib/stripe-js'
import { toast } from 'sonner'

const mockCreatePayment = createPayment as any
const mockGetStripeJs = getStripeJs as any
const mockToast = toast as any

describe('FormDonate', () => {
  const mockData = {
    slug: () => faker.internet.username(),
    creatorId: () => faker.string.uuid(),
    name: () => faker.person.fullName(),
    message: () => faker.lorem.sentence(),
    sessionId: () => `cs_${faker.string.alphanumeric(32)}`,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFormState.isSubmitting = false
  })

  describe('Renderização do Componente', () => {
    it('deve renderizar todos os elementos do formulário', () => {
      const slug = mockData.slug()
      const creatorId = mockData.creatorId()

      render(<FormDonate slug={slug} creatorId={creatorId} />)

      expect(screen.getByTestId('card')).toBeInTheDocument()
      expect(screen.getByTestId('card-title')).toHaveTextContent('Apoiar')
      expect(screen.getByTestId('card-description')).toHaveTextContent('Sua contribuição ajuda muito!')
      expect(screen.getByTestId('form')).toBeInTheDocument()
    })

    it('deve renderizar os valores de preço corretos', () => {
      const slug = mockData.slug()
      const creatorId = mockData.creatorId()

      render(<FormDonate slug={slug} creatorId={creatorId} />)

      expect(screen.getByText('R$ 15')).toBeInTheDocument()
      expect(screen.getByText('R$ 25')).toBeInTheDocument()
      expect(screen.getByText('R$ 35')).toBeInTheDocument()
    })

    it('deve renderizar o botão com texto correto quando não está processando', () => {
      const slug = mockData.slug()
      const creatorId = mockData.creatorId()

      render(<FormDonate slug={slug} creatorId={creatorId} />)

      expect(screen.getByTestId('button')).toHaveTextContent('Fazer doação')
      expect(screen.getByTestId('button')).not.toBeDisabled()
    })

    it('deve renderizar o botão desabilitado quando está processando', () => {
      const slug = mockData.slug()
      const creatorId = mockData.creatorId()
      mockFormState.isSubmitting = true

      render(<FormDonate slug={slug} creatorId={creatorId} />)

      expect(screen.getByTestId('button')).toHaveTextContent('Processando...')
      expect(screen.getByTestId('button')).toBeDisabled()
    })
  })

  describe('Função handlePaymentResponse', () => {
    let component: any

    beforeEach(() => {
      const slug = mockData.slug()
      const creatorId = mockData.creatorId()
      component = render(<FormDonate slug={slug} creatorId={creatorId} />)
    })

    it('deve exibir erro quando checkout.error está presente', async () => {

      const errorMessage = 'Erro de pagamento'
      mockCreatePayment.mockResolvedValue({ error: errorMessage })

      const onSubmit = mockHandleSubmit.mock.calls[0]?.[0]
      if (onSubmit) {
        await onSubmit({
          name: mockData.name(),
          message: mockData.message(),
          price: '15'
        })

        expect(mockToast.error).toHaveBeenCalledWith(errorMessage)
      }
    })

    it('deve exibir erro quando sessionId não está presente', async () => {
      // Arrange
      mockCreatePayment.mockResolvedValue({})

      const onSubmit = mockHandleSubmit.mock.calls[0]?.[0]
      if (onSubmit) {
        await onSubmit({
          name: mockData.name(),
          message: mockData.message(),
          price: '25'
        })

        expect(mockToast.error).toHaveBeenCalledWith('Falha ao criar o pagamento, tente novamente')
      }
    })

    it('deve exibir erro quando getStripeJs retorna null', async () => {
      const sessionId = mockData.sessionId()
      mockCreatePayment.mockResolvedValue({ sessionId })
      mockGetStripeJs.mockResolvedValue(null)

      const onSubmit = mockHandleSubmit.mock.calls[0]?.[0]
      if (onSubmit) {
        await onSubmit({
          name: mockData.name(),
          message: mockData.message(),
          price: '35'
        })

        expect(mockToast.error).toHaveBeenCalledWith('Falha ao criar o pagamento, tente novamente')
      }
    })

    it('deve redirecionar para checkout quando tudo está correto', async () => {
      const sessionId = mockData.sessionId()
      const mockStripe = {
        redirectToCheckout: vi.fn()
      }

      mockCreatePayment.mockResolvedValue({ sessionId })
      mockGetStripeJs.mockResolvedValue(mockStripe)

      const onSubmit = mockHandleSubmit.mock.calls[0]?.[0]
      if (onSubmit) {
        await onSubmit({
          name: mockData.name(),
          message: mockData.message(),
          price: '15'
        })

        expect(mockStripe.redirectToCheckout).toHaveBeenCalledWith({ sessionId })
        expect(mockToast.error).not.toHaveBeenCalled()
      }
    })
  })

  describe('Validação de Dados do Formulário', () => {
    it('deve converter o preço para centavos corretamente', async () => {
      const slug = mockData.slug()
      const creatorId = mockData.creatorId()
      const sessionId = mockData.sessionId()

      mockCreatePayment.mockResolvedValue({ sessionId })
      mockGetStripeJs.mockResolvedValue({ redirectToCheckout: vi.fn() })

      render(<FormDonate slug={slug} creatorId={creatorId} />)

      const onSubmit = mockHandleSubmit.mock.calls[0]?.[0]
      if (onSubmit) {
        const testCases = [
          { price: '15', expectedCents: 1500 },
          { price: '25', expectedCents: 2500 },
          { price: '35', expectedCents: 3500 },
        ]

        for (const { price, expectedCents } of testCases) {
          const formData = {
            name: mockData.name(),
            message: mockData.message(),
            price
          }

          await onSubmit(formData)

          expect(mockCreatePayment).toHaveBeenCalledWith({
            name: formData.name,
            message: formData.message,
            price: expectedCents,
            creatorId,
            slug
          })

          vi.clearAllMocks()
          mockCreatePayment.mockResolvedValue({ sessionId })
        }
      }
    })

    it('deve passar todos os dados necessários para createPayment', async () => {
      const slug = mockData.slug()
      const creatorId = mockData.creatorId()
      const sessionId = mockData.sessionId()
      const formData = {
        name: mockData.name(),
        message: mockData.message(),
        price: '25'
      }

      mockCreatePayment.mockResolvedValue({ sessionId })
      mockGetStripeJs.mockResolvedValue({ redirectToCheckout: vi.fn() })

      render(<FormDonate slug={slug} creatorId={creatorId} />)

      const onSubmit = mockHandleSubmit.mock.calls[0]?.[0]
      if (onSubmit) {
        await onSubmit(formData)

        expect(mockCreatePayment).toHaveBeenCalledWith({
          name: formData.name,
          message: formData.message,
          price: 2500,
          creatorId,
          slug
        })
      }
    })
  })

  describe('Casos Edge', () => {
    it('deve lidar com nomes muito longos', async () => {
      const slug = mockData.slug()
      const creatorId = mockData.creatorId()
      const sessionId = mockData.sessionId()
      const longName = faker.lorem.words(50) // Nome muito longo

      mockCreatePayment.mockResolvedValue({ sessionId })
      mockGetStripeJs.mockResolvedValue({ redirectToCheckout: vi.fn() })

      render(<FormDonate slug={slug} creatorId={creatorId} />)

      const onSubmit = mockHandleSubmit.mock.calls[0]?.[0]
      if (onSubmit) {
        await onSubmit({
          name: longName,
          message: mockData.message(),
          price: '15'
        })

        expect(mockCreatePayment).toHaveBeenCalledWith(
          expect.objectContaining({
            name: longName
          })
        )
      }
    })

    it('deve lidar com mensagens muito longas', async () => {
      const slug = mockData.slug()
      const creatorId = mockData.creatorId()
      const sessionId = mockData.sessionId()
      const longMessage = faker.lorem.paragraphs(10)

      mockCreatePayment.mockResolvedValue({ sessionId })
      mockGetStripeJs.mockResolvedValue({ redirectToCheckout: vi.fn() })

      render(<FormDonate slug={slug} creatorId={creatorId} />)

      const onSubmit = mockHandleSubmit.mock.calls[0]?.[0]
      if (onSubmit) {
        await onSubmit({
          name: mockData.name(),
          message: longMessage,
          price: '35'
        })

        expect(mockCreatePayment).toHaveBeenCalledWith(
          expect.objectContaining({
            message: longMessage
          })
        )
      }
    })

    it('deve lidar com caracteres especiais no nome e mensagem', async () => {
      const slug = mockData.slug()
      const creatorId = mockData.creatorId()
      const sessionId = mockData.sessionId()
      const nameWithSpecialChars = 'João & Maria - 123 @test #special'
      const messageWithSpecialChars = 'Mensagem com "aspas", símbolos $ € & emojis 🎉🚀'

      mockCreatePayment.mockResolvedValue({ sessionId })
      mockGetStripeJs.mockResolvedValue({ redirectToCheckout: vi.fn() })

      render(<FormDonate slug={slug} creatorId={creatorId} />)

      const onSubmit = mockHandleSubmit.mock.calls[0]?.[0]
      if (onSubmit) {
        await onSubmit({
          name: nameWithSpecialChars,
          message: messageWithSpecialChars,
          price: '25'
        })

        expect(mockCreatePayment).toHaveBeenCalledWith(
          expect.objectContaining({
            name: nameWithSpecialChars,
            message: messageWithSpecialChars
          })
        )
      }
    })
  })
})
