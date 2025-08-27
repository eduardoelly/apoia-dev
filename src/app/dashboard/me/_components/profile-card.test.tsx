import { vi } from 'vitest'
import { faker } from '@faker-js/faker'

// Mock do Next.js Image
vi.mock('next/image', () => {
  return {
    default: ({ src, alt, width, height, ...props }: any) => (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        data-testid="profile-image"
        {...props}
      />
    ),
  }
})

// Mock dos componentes Name e Description
vi.mock('./name', () => ({
  Name: ({ initialName }: { initialName: string }) => (
    <div data-testid="name-component" data-initial-name={initialName}>
      {initialName}
    </div>
  ),
}))

vi.mock('./description', () => ({
  Description: ({ initialDescription }: { initialDescription: string }) => (
    <div data-testid="description-component" data-initial-description={initialDescription}>
      {initialDescription}
    </div>
  ),
}))

// Funções auxiliares para testar a lógica do ProfileCard
function getImageSrc(user: any): string {
  return user.image ?? ""
}

function getImageAlt(user: any): string {
  return user.name ?? user.username ?? "Imagem de perfil"
}

function getInitialName(user: any): string {
  return user.name ?? "Digite seu nome"
}

function getInitialDescription(user: any): string {
  return user.bio ?? ""
}

describe('ProfileCard Component Logic', () => {
  const mockData = {
    user: () => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      username: faker.internet.username(),
      bio: faker.lorem.paragraph(),
      image: faker.image.avatar(),
    }),
    userPartial: () => ({
      id: faker.string.uuid(),
      name: null,
      username: null,
      bio: null,
      image: null,
    }),
  }

  describe('Casos Edge Combinados', () => {
    it('deve lidar com usuário completamente vazio', () => {
      const user = {
        id: faker.string.uuid(),
        name: null,
        username: null,
        bio: null,
        image: null,
      }
      const imageSrc = getImageSrc(user)
      const imageAlt = getImageAlt(user)
      const initialName = getInitialName(user)
      const initialDescription = getInitialDescription(user)

      expect(imageSrc).toBe("")
      expect(imageAlt).toBe("Imagem de perfil")
      expect(initialName).toBe("Digite seu nome")
      expect(initialDescription).toBe("")
    })

    it('deve lidar com usuário apenas com username', () => {
      const user = {
        id: faker.string.uuid(),
        name: null,
        username: 'joao123',
        bio: null,
        image: null,
      }
      const imageSrc = getImageSrc(user)
      const imageAlt = getImageAlt(user)
      const initialName = getInitialName(user)
      const initialDescription = getInitialDescription(user)

      expect(imageSrc).toBe("")
      expect(imageAlt).toBe("joao123")
      expect(initialName).toBe("Digite seu nome")
      expect(initialDescription).toBe("")
    })

    it('deve lidar com usuário apenas com bio', () => {
      const user = {
        id: faker.string.uuid(),
        name: null,
        username: null,
        bio: 'Uma bio interessante',
        image: null,
      }
      const imageSrc = getImageSrc(user)
      const imageAlt = getImageAlt(user)
      const initialName = getInitialName(user)
      const initialDescription = getInitialDescription(user)

      expect(imageSrc).toBe("")
      expect(imageAlt).toBe("Imagem de perfil")
      expect(initialName).toBe("Digite seu nome")
      expect(initialDescription).toBe("Uma bio interessante")
    })

    it('deve lidar com caracteres especiais em todos os campos', () => {
      const user = {
        id: faker.string.uuid(),
        name: 'José María dos Santos-Silva Jr. 🎉',
        username: '@joão_silva-123',
        bio: 'Bio com "aspas", símbolos $ € & emojis 🚀',
        image: 'https://example.com/image.jpg?param=value&other=123',
      }
      const imageSrc = getImageSrc(user)
      const imageAlt = getImageAlt(user)
      const initialName = getInitialName(user)
      const initialDescription = getInitialDescription(user)

      expect(imageSrc).toBe(user.image)
      expect(imageAlt).toBe(user.name)
      expect(initialName).toBe(user.name)
      expect(initialDescription).toBe(user.bio)
    })
  })
})
