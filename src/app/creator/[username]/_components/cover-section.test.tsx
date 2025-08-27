import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { CoverSection } from './cover-section'

// Mock do Next.js Image
vi.mock('next/image', () => {
  return {
    default: ({ src, alt, fill, priority, quality, ...props }: any) => (
      <img
        src={src || undefined}
        alt={alt}
        data-testid="next-image"
        data-fill={fill ? 'true' : undefined}
        data-priority={priority ? 'true' : undefined}
        data-quality={quality}
        {...props}
      />
    ),
  }
})

// Mock dos componentes UI
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => (
    <div data-testid="avatar" className={className}>{children}</div>
  ),
  AvatarFallback: ({ children, className }: any) => (
    <div data-testid="avatar-fallback" className={className}>{children}</div>
  ),
  AvatarImage: ({ src, className }: any) => (
    <img data-testid="avatar-image" src={src || undefined} className={className} alt='' />
  ),
}))

describe('CoverSection', () => {
  const mockData = {
    coverImage: () => faker.image.urlPicsumPhotos({ width: 800, height: 400 }),
    profileImage: () => faker.image.avatar(),
    name: () => faker.person.fullName(),
  }

  it('deve renderizar todas as imagens e informações corretamente', () => {
    const coverImage = mockData.coverImage()
    const profileImage = mockData.profileImage()
    const name = mockData.name()

    render(
      <CoverSection
        coverImage={coverImage}
        profileImage={profileImage}
        name={name}
      />
    )

    expect(screen.getByTestId('next-image')).toHaveAttribute('src', coverImage)
    expect(screen.getByTestId('next-image')).toHaveAttribute('alt', 'Capa de usuário')
    expect(screen.getByTestId('avatar-image')).toHaveAttribute('src', profileImage)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(name)
  })

  it('deve gerar iniciais corretas para o fallback do avatar - nome simples', () => {
    const coverImage = mockData.coverImage()
    const profileImage = mockData.profileImage()
    const name = 'João'

    render(
      <CoverSection
        coverImage={coverImage}
        profileImage={profileImage}
        name={name}
      />
    )

    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('J')
  })

  it('deve gerar iniciais corretas para o fallback do avatar - nome composto', () => {
    const coverImage = mockData.coverImage()
    const profileImage = mockData.profileImage()
    const name = 'João Silva Santos'

    render(
      <CoverSection
        coverImage={coverImage}
        profileImage={profileImage}
        name={name}
      />
    )

    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JSS')
  })

  it('deve gerar iniciais corretas para o fallback do avatar - nome com caracteres especiais', () => {
    const coverImage = mockData.coverImage()
    const profileImage = mockData.profileImage()
    const name = 'José da Silva'

    render(
      <CoverSection
        coverImage={coverImage}
        profileImage={profileImage}
        name={name}
      />
    )

    // Assert
    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JdS')
  })

  it('deve lidar com nome vazio para o fallback', () => {
    const coverImage = mockData.coverImage()
    const profileImage = mockData.profileImage()
    const name = ''

    render(
      <CoverSection
        coverImage={coverImage}
        profileImage={profileImage}
        name={name}
      />
    )

    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('')
  })

  it('deve lidar com nome de uma palavra única', () => {
    const coverImage = mockData.coverImage()
    const profileImage = mockData.profileImage()
    const name = 'Madonna'

    render(
      <CoverSection
        coverImage={coverImage}
        profileImage={profileImage}
        name={name}
      />
    )

    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('M')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Madonna')
  })

  it('deve lidar com nomes muito longos', () => {

    const coverImage = mockData.coverImage()
    const profileImage = mockData.profileImage()
    const longName = faker.lorem.words(10) // Nome muito longo

    render(
      <CoverSection
        coverImage={coverImage}
        profileImage={profileImage}
        name={longName}
      />
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(longName)
    const expectedInitials = longName.split(' ').map(word => word[0]).join('')
    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent(expectedInitials)
  })

  it('deve renderizar com URLs de imagem inválidas ou vazias', () => {
    const coverImage = ''
    const profileImage = ''
    const name = mockData.name()

    render(
      <CoverSection
        coverImage={coverImage}
        profileImage={profileImage}
        name={name}
      />
    )

    expect(screen.getByTestId('next-image')).not.toHaveAttribute('src')
    expect(screen.getByTestId('avatar-image')).not.toHaveAttribute('src')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(name)
  })

  it('deve renderizar a estrutura HTML correta', () => {
    const coverImage = mockData.coverImage()
    const profileImage = mockData.profileImage()
    const name = mockData.name()

    const { container } = render(
      <CoverSection
        coverImage={coverImage}
        profileImage={profileImage}
        name={name}
      />
    )

    expect(container.querySelector('.relative.h-48')).toBeInTheDocument()
    expect(container.querySelector('.absolute.inset-0.bg-gradient-to-t')).toBeInTheDocument()
    expect(container.querySelector('.absolute.bottom-2')).toBeInTheDocument()
  })

  it('deve lidar com nomes que contêm números e caracteres especiais', () => {
    const coverImage = mockData.coverImage()
    const profileImage = mockData.profileImage()
    const name = 'João123 & Maria-456'

    render(
      <CoverSection
        coverImage={coverImage}
        profileImage={profileImage}
        name={name}
      />
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(name)
    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('J&M')
  })

  it('deve validar atributos da imagem de capa', () => {
    const coverImage = mockData.coverImage()
    const profileImage = mockData.profileImage()
    const name = mockData.name()

    render(
      <CoverSection
        coverImage={coverImage}
        profileImage={profileImage}
        name={name}
      />
    )

    const coverImageEl = screen.getByTestId('next-image')
    expect(coverImageEl).toHaveAttribute('data-fill', 'true')
    expect(coverImageEl).toHaveAttribute('data-priority', 'true')
    expect(coverImageEl).toHaveAttribute('data-quality', '100')
  })
})
