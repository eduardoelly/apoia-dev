import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { createUsername } from './create-username'

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock do prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock do createSlug
vi.mock('@/utils/create-slug', () => ({
  createSlug: vi.fn(),
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/utils/create-slug'

const mockAuth = auth as any
const mockPrisma = prisma as any
const mockCreateSlug = createSlug as any

describe('createUsername', () => {
  const mockData = {
    userId: () => faker.string.uuid(),
    username: () => faker.internet.username(),
    slug: () => faker.internet.username().toLowerCase(),
    shortUsername: () => 'abc', // Menos de 4 caracteres
    validUsername: () => faker.internet.username() + '123', // Mais de 4 caracteres
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Autenticação', () => {
    it('deve retornar erro quando usuário não está autenticado', async () => {
      mockAuth.mockResolvedValue(null)
      const username = mockData.validUsername()
      const result = await createUsername({ username })
      expect(result).toEqual({
        data: null,
        error: 'Usuário não autenticado',
      })
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled()
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('deve retornar erro quando session não tem user', async () => {
      mockAuth.mockResolvedValue({})
      const username = mockData.validUsername()
      const result = await createUsername({ username })
      expect(result).toEqual({
        data: null,
        error: 'Usuário não autenticado',
      })
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled()
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('deve processar quando session tem user válido', async () => {
      const userId = mockData.userId()
      const username = mockData.validUsername()
      const slug = mockData.slug()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockCreateSlug.mockReturnValue(slug)
      mockPrisma.user.findFirst.mockResolvedValue(null) // Username disponível
      mockPrisma.user.update.mockResolvedValue({})
      const result = await createUsername({ username })
      expect(result).toEqual({
        data: slug,
        error: null,
      })
    })
  })

  describe('Validação de Schema', () => {
    it('deve retornar erro quando username tem menos de 4 caracteres', async () => {
      const userId = mockData.userId()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      const shortUsername = mockData.shortUsername()
      const result = await createUsername({ username: shortUsername })
      expect(result).toEqual({
        data: null,
        error: 'O username deve ter no mínimo 4 caracteres.',
      })
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled()
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('deve aceitar username com exatamente 4 caracteres', async () => {
      const userId = mockData.userId()
      const username = 'test'
      const slug = 'test'
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockCreateSlug.mockReturnValue(slug)
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockPrisma.user.update.mockResolvedValue({})
      const result = await createUsername({ username })
      expect(result).toEqual({
        data: slug,
        error: null,
      })
    })

    it('deve retornar erro para username vazio', async () => {
      const userId = mockData.userId()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      const result = await createUsername({ username: '' })
      expect(result).toEqual({
        data: null,
        error: 'O username deve ter no mínimo 4 caracteres.',
      })
    })

    it('deve retornar erro para username undefined', async () => {
      const userId = mockData.userId()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      const result = await createUsername({ username: undefined as any })
      expect(result).toEqual({
        data: null,
        error: 'O username é obrigatório.',
      })
    })
  })

  describe('Verificação de Duplicação', () => {
    it('deve retornar erro quando username já está em uso', async () => {
      const userId = mockData.userId()
      const username = mockData.validUsername()
      const slug = mockData.slug()
      const existingUser = { id: 'other-user-id', username: slug }

      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockCreateSlug.mockReturnValue(slug)
      mockPrisma.user.findFirst.mockResolvedValue(existingUser)
      const result = await createUsername({ username })
      expect(result).toEqual({
        data: null,
        error: 'Este username já está em uso.',
      })
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: slug },
      })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('deve permitir criar username quando não existe duplicação', async () => {
      const userId = mockData.userId()
      const username = mockData.validUsername()
      const slug = mockData.slug()

      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockCreateSlug.mockReturnValue(slug)
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockPrisma.user.update.mockResolvedValue({})
      const result = await createUsername({ username })
      expect(result).toEqual({
        data: slug,
        error: null,
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { username: slug },
      })
    })
  })

  describe('Criação de Slug', () => {
    it('deve usar createSlug para converter username', async () => {
      const userId = mockData.userId()
      const username = 'João Silva 123!'
      const expectedSlug = 'joao-silva-123'
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockCreateSlug.mockReturnValue(expectedSlug)
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockPrisma.user.update.mockResolvedValue({})
      const result = await createUsername({ username })

      expect(mockCreateSlug).toHaveBeenCalledWith(username)
      expect(result).toEqual({
        data: expectedSlug,
        error: null,
      })
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve retornar erro quando falha ao verificar duplicação', async () => {
      const userId = mockData.userId()
      const username = mockData.validUsername()
      const slug = mockData.slug()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockCreateSlug.mockReturnValue(slug)
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database error'))
      const result = await createUsername({ username })
      expect(result).toEqual({
        data: null,
        error: 'Falha ao atualizar o username.',
      })
    })

    it('deve retornar erro quando falha ao atualizar usuário', async () => {
      const userId = mockData.userId()
      const username = mockData.validUsername()
      const slug = mockData.slug()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockCreateSlug.mockReturnValue(slug)
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockPrisma.user.update.mockRejectedValue(new Error('Update failed'))
      const result = await createUsername({ username })
      expect(result).toEqual({
        data: null,
        error: 'Falha ao atualizar o username.',
      })
    })

    it('deve lidar com erro de constraint único', async () => {
      const userId = mockData.userId()
      const username = mockData.validUsername()
      const slug = mockData.slug()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockCreateSlug.mockReturnValue(slug)
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockPrisma.user.update.mockRejectedValue(new Error('Unique constraint'))
      const result = await createUsername({ username })
      expect(result).toEqual({
        data: null,
        error: 'Falha ao atualizar o username.',
      })
    })

    it('deve lidar com erro de conexão', async () => {
      const userId = mockData.userId()
      const username = mockData.validUsername()
      const slug = mockData.slug()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockCreateSlug.mockReturnValue(slug)
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Connection timeout'))
      const result = await createUsername({ username })
      expect(result).toEqual({
        data: null,
        error: 'Falha ao atualizar o username.',
      })
    })
  })
})
