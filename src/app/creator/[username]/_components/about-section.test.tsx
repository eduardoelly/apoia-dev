import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { AboutSection } from './about-section'

// Mock dos componentes UI
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <h1 data-testid="card-title" className={className}>{children}</h1>,
}))

describe('AboutSection', () => {
  const mockData = {
    name: () => faker.person.fullName(),
    description: () => faker.lorem.paragraph(),
    longDescription: () => faker.lorem.paragraphs(5),
    shortDescription: () => faker.lorem.sentence(),
  }

  it('deve renderizar o nome e descrição corretamente', () => {
    const name = mockData.name()
    const description = mockData.description()

    render(<AboutSection name={name} description={description} />)

    expect(screen.getByTestId('card-title')).toHaveTextContent(name)
    expect(screen.getByText(description)).toBeInTheDocument()
  })

  it('deve renderizar com nome vazio', () => {
    const name = ''
    const description = mockData.description()

    render(<AboutSection name={name} description={description} />)

    expect(screen.getByTestId('card-title')).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
  })

  it('deve renderizar com descrição vazia', () => {
    const name = mockData.name()
    const description = ''

    render(<AboutSection name={name} description={description} />)

    expect(screen.getByTestId('card-title')).toHaveTextContent(name)
    const descriptionElement = screen.getByTestId('card-content').querySelector('p')
    expect(descriptionElement).toBeInTheDocument()
    expect(descriptionElement).toHaveTextContent('')
  })

  it('deve lidar com descrições muito longas', () => {
    const name = mockData.name()
    const longDescription = mockData.longDescription()

    render(<AboutSection name={name} description={longDescription} />)

    expect(screen.getByTestId('card-title')).toHaveTextContent(name)
    const descriptionElement = screen.getByTestId('card-content').querySelector('p')
    expect(descriptionElement).toBeInTheDocument()
    const normalizedExpected = longDescription.replace(/\s+/g, ' ').trim()
    const normalizedActual = descriptionElement?.textContent?.replace(/\s+/g, ' ').trim()
    expect(normalizedActual).toBe(normalizedExpected)
  })

  it('deve lidar com nomes muito longos', () => {
    const longName = faker.lorem.words(20)
    const description = mockData.description()

    render(<AboutSection name={longName} description={description} />)

    expect(screen.getByTestId('card-title')).toHaveTextContent(longName)
    expect(screen.getByText(description)).toBeInTheDocument()
  })

  it('deve lidar com caracteres especiais no nome e descrição', () => {
    const nameWithSpecialChars = 'João & Maria - 123 @test #special'
    const descriptionWithSpecialChars = 'Descrição com "aspas", símbolos $ € & caracteres especiais áéíóú'

    render(<AboutSection name={nameWithSpecialChars} description={descriptionWithSpecialChars} />)

    expect(screen.getByTestId('card-title')).toHaveTextContent(nameWithSpecialChars)
    expect(screen.getByText(descriptionWithSpecialChars)).toBeInTheDocument()
  })

  it('deve renderizar a estrutura correta do componente', () => {
    const name = mockData.name()
    const description = mockData.description()

    render(<AboutSection name={name} description={description} />)

    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByTestId('card-header')).toBeInTheDocument()
    expect(screen.getByTestId('card-content')).toBeInTheDocument()
    expect(screen.getByTestId('card-title')).toBeInTheDocument()
  })
})
