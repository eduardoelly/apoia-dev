import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { faker } from '@faker-js/faker'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { CreateAccountButton } from './create-account-button'

const mockFetch = vi.fn()
const mockToast = vi.fn()
const mockLocation: { href: string } = { href: '' }

vi.stubGlobal('fetch', mockFetch)
vi.stubGlobal('location', mockLocation)
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }))

const setup = () => userEvent.setup({ delay: null })

describe('CreateAccountButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.href = ''
  })

  it('deve renderizar com texto inicial', () => {
    render(<CreateAccountButton />)
    expect(screen.getByRole('button')).toHaveTextContent('Ativar conta de pagamento')
  })

  it('deve redirecionar após sucesso', async () => {
    const user = setup()
    const redirectUrl = faker.internet.url()

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: redirectUrl }),
    })

    render(<CreateAccountButton />)
    await user.click(screen.getByRole('button'))

    expect(await screen.findByText('Carregando...')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalled()
    expect(mockLocation.href).toBe(redirectUrl)
  })

  it('deve voltar ao estado inicial após erro de rede', async () => {
    const user = setup()
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<CreateAccountButton />)
    await user.click(screen.getByRole('button'))

    expect(await screen.findByText('Ativar conta de pagamento')).toBeInTheDocument()
  })

  it('deve prevenir múltiplos cliques', async () => {
    const user = setup()
    const redirectUrl = faker.internet.url()

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: redirectUrl }),
    })

    render(<CreateAccountButton />)

    const btn = screen.getByRole('button')
    await user.click(btn)
    await user.click(btn)
    await user.click(btn)

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
