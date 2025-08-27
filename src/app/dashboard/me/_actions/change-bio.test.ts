import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { changeBio } from './change-bio'

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock do prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const mockAuth = auth as any
const mockPrisma = prisma as any

describe('changeBio', () => {
  const mockData = {
    userId: () => faker.string.uuid(),
    description: () => faker.lorem.paragraph(),
    shortDescription: () => faker.lorem.words(2), // Menos de 4 caracteres
    validDescription: () => faker.lorem.words(5), // Mais de 4 caracteres
    bio: () => faker.lorem.sentence(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Autenticação', () => {
    it('deve retornar erro quando usuário não está autenticado', async () => {
      mockAuth.mockResolvedValue(null)
      const description = mockData.validDescription()
      const result = await changeBio({ description })
      expect(result).toEqual({
        data: null,
        error: 'Usuário não autenticado',
      })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('deve retornar erro quando session não tem user', async () => {
      mockAuth.mockResolvedValue({})
      const description = mockData.validDescription()
      const result = await changeBio({ description })
      expect(result).toEqual({
        data: null,
        error: 'Usuário não autenticado',
      })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('deve retornar erro quando user não tem id', async () => {
      mockAuth.mockResolvedValue({ user: {} })
      const description = mockData.validDescription()
      const result = await changeBio({ description })
      expect(result).toEqual({
        data: null,
        error: 'Usuário não autenticado',
      })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('Validação de Schema', () => {
    it('deve retornar erro quando descrição tem menos de 4 caracteres', async () => {
      const userId = mockData.userId()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      const shortDescription = 'abc'
      const result = await changeBio({ description: shortDescription })
      expect(result).toEqual({
        data: null,
        error: 'A descrição precisa ter no mínimo 4 caracteres',
      })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('deve aceitar descrição com exatamente 4 caracteres', async () => {
      const userId = mockData.userId()
      const bio = mockData.bio()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockResolvedValue({ bio })
      const validDescription = 'abcd'
      const result = await changeBio({ description: validDescription })
      expect(result).toEqual({
        data: bio,
        error: null,
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { bio: validDescription },
      })
    })

    it('deve aceitar descrição vazia (string vazia passa na validação do Zod)', async () => {
      const userId = mockData.userId()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      const result = await changeBio({ description: '' })
      expect(result).toEqual({
        data: null,
        error: 'A descrição precisa ter no mínimo 4 caracteres',
      })
    })
  })

  describe('Atualização no Banco de Dados', () => {
    it('deve atualizar bio com sucesso', async () => {
      const userId = mockData.userId()
      const description = mockData.validDescription()
      const updatedBio = mockData.bio()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockResolvedValue({ bio: updatedBio })
      const result = await changeBio({ description })
      expect(result).toEqual({
        data: updatedBio,
        error: null,
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { bio: description },
      })
    })

    it('deve lidar com descrições muito longas', async () => {
      const userId = mockData.userId()
      const longDescription = faker.lorem.paragraphs(10)
      const updatedBio = mockData.bio()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockResolvedValue({ bio: updatedBio })
      const result = await changeBio({ description: longDescription })
      expect(result).toEqual({
        data: updatedBio,
        error: null,
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { bio: longDescription },
      })
    })

    it('deve lidar com caracteres especiais na descrição', async () => {
      const userId = mockData.userId()
      const specialDescription = 'Descrição com "aspas", símbolos $ € & emojis 🎉🚀'
      const updatedBio = mockData.bio()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockResolvedValue({ bio: updatedBio })
      const result = await changeBio({ description: specialDescription })
      expect(result).toEqual({
        data: updatedBio,
        error: null,
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { bio: specialDescription },
      })
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve retornar erro quando falha ao atualizar no banco', async () => {
      const userId = mockData.userId()
      const description = mockData.validDescription()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockRejectedValue(new Error('Database error'))
      const result = await changeBio({ description })

      expect(result).toEqual({
        data: null,
        error: 'Falha ao salvar alterações',
      })
    })

    it('deve lidar com erro de constraint do banco', async () => {
      const userId = mockData.userId()
      const description = mockData.validDescription()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockRejectedValue(new Error('Constraint violation'))
      const result = await changeBio({ description })

      expect(result).toEqual({
        data: null,
        error: 'Falha ao salvar alterações',
      })
    })

    it('deve lidar com erro de conexão com banco', async () => {
      const userId = mockData.userId()
      const description = mockData.validDescription()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockRejectedValue(new Error('Connection timeout'))
      const result = await changeBio({ description })

      expect(result).toEqual({
        data: null,
        error: 'Falha ao salvar alterações',
      })
    })
  })

  describe('Casos Edge', () => {
    it('deve lidar com bio null retornada do banco', async () => {
      const userId = mockData.userId()
      const description = mockData.validDescription()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockResolvedValue({ bio: null })
      const result = await changeBio({ description })
      expect(result).toEqual({
        data: null,
        error: null,
      })
    })

    it('deve preservar espaços em branco na descrição', async () => {
      const userId = mockData.userId()
      const descriptionWithSpaces = '    Descrição com espaços    '
      const updatedBio = mockData.bio()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockResolvedValue({ bio: updatedBio })
      const result = await changeBio({ description: descriptionWithSpaces })

      expect(result).toEqual({
        data: updatedBio,
        error: null,
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { bio: descriptionWithSpaces },
      })
    })
  })
})
