import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { DonationTable } from './donates'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mockDonationCompleted, createMockDonationCompleted } from '@/mocks'

vi.mock('@/utils/format', () => ({
  formatCurrency: vi.fn((value: number) => `R$ ${value.toFixed(2)}`),
  formatDate: vi.fn((date: string) => new Date(date).toLocaleDateString('pt-BR')),
}))

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table data-testid="table">{children}</table>,
  TableBody: ({ children }: any) => <tbody data-testid="table-body">{children}</tbody>,
  TableCell: ({ children, className }: any) => (
    <td data-testid="table-cell" className={className}>{children}</td>
  ),
  TableHead: ({ children, className }: any) => (
    <th data-testid="table-head" className={className}>{children}</th>
  ),
  TableHeader: ({ children }: any) => <thead data-testid="table-header">{children}</thead>,
  TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import { formatCurrency, formatDate } from '@/utils/format'
const mockFormatCurrency = formatCurrency as any
const mockFormatDate = formatDate as any

describe('DonationTable', () => {
  let queryClient: QueryClient
  const originalEnv = process.env.NEXT_PUBLIC_HOST_URL

  beforeAll(() => {
    process.env.NEXT_PUBLIC_HOST_URL = faker.internet.url()
  })

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_HOST_URL = originalEnv
    } else {
      delete process.env.NEXT_PUBLIC_HOST_URL
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    )
  }

  describe('Estado de Loading', () => {
    it('deve exibir estado de carregamento', async () => {
      mockFetch.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] })
          }), 100)
        })
      )

      renderWithQueryClient(<DonationTable />)

      expect(screen.getByText('Carregando...')).toBeInTheDocument()
      expect(screen.getByText('Carregando...')).toHaveClass('text-center', 'text-gray-700')
    })

    it('deve esconder o loading após carregar os dados', async () => {
      const donations = [mockDonationCompleted]

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: donations })
      })

      renderWithQueryClient(<DonationTable />)

      await waitFor(() => {
        expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
      }, { timeout: 1000 })
    })
  })

  describe('Chamadas da API', () => {
    it('deve fazer a chamada correta para a API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      })

      renderWithQueryClient(<DonationTable />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `${process.env.NEXT_PUBLIC_HOST_URL}/api/donates`
        )
      }, { timeout: 1000 })
    })

    it('deve lidar com resposta de erro da API', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'API Error' })
      })

      renderWithQueryClient(<DonationTable />)

      await waitFor(() => {
        expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
      }, { timeout: 1000 })

      const tableRows = screen.getAllByTestId('table-row')
      expect(tableRows).toHaveLength(1)
    })

    it('deve lidar com erro de rede', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      renderWithQueryClient(<DonationTable />)

      await waitFor(() => {
        expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
      }, { timeout: 1000 })
    })
  })

  describe('Casos Edge', () => {
    it('deve lidar com lista vazia de doações', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      })

      renderWithQueryClient(<DonationTable />)

      await waitFor(() => {
        expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
      }, { timeout: 1000 })

      expect(screen.getByTestId('table')).toBeInTheDocument()
      const tableRows = screen.getAllByTestId('table-row')
      expect(tableRows).toHaveLength(1)
    })

    it('deve lidar com mensagens muito longas', async () => {
      const donation = {
        ...mockDonationCompleted,
        donorMessage: faker.lorem.paragraphs(5)
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [donation] })
      })

      renderWithQueryClient(<DonationTable />)

      await waitFor(() => {
        const messageCells = screen.getAllByTestId('table-cell')
        const messageCell = messageCells.find(cell =>
          cell.textContent?.includes(donation.donorMessage.substring(0, 50))
        )
        expect(messageCell).toBeInTheDocument()
      })

      const messageCells = screen.getAllByTestId('table-cell')
      const messageCell = messageCells.find(cell =>
        cell.textContent === donation.donorMessage
      )
      expect(messageCell).toHaveClass('max-w-72')
    })

    it('deve lidar com nomes muito longos', async () => {
      const donation = {
        ...mockDonationCompleted,
        donorName: faker.lorem.words(20)
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [donation] })
      })

      renderWithQueryClient(<DonationTable />)

      await waitFor(() => {
        expect(screen.getAllByText(donation.donorName)).toHaveLength(2) // Desktop + Mobile
      }, { timeout: 1000 })
    })

    it('deve lidar com caracteres especiais nos dados', async () => {
      const donation = {
        ...mockDonationCompleted,
        donorName: 'João & Maria - 123 @test #special',
        donorMessage: 'Mensagem com "aspas", símbolos $ € & emojis 🎉🚀'
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [donation] })
      })

      renderWithQueryClient(<DonationTable />)

      await waitFor(() => {
        expect(screen.getAllByText(donation.donorName)).toHaveLength(2) // Desktop + Mobile
        expect(screen.getAllByText(donation.donorMessage)).toHaveLength(2) // Desktop + Mobile
      }, { timeout: 1000 })
    })
  })

  describe('Refresh de Dados', () => {
    it('deve configurar refetch interval corretamente', async () => {
      const donations = [mockDonationCompleted]

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: donations })
      })

      renderWithQueryClient(<DonationTable />)

      await waitFor(() => {
        expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
      }, { timeout: 1000 })

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
