import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { changeName } from './change-name'

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

describe('changeName', () => {
  const mockData = {
    userId: () => faker.string.uuid(),
    name: () => faker.person.fullName(),
    shortName: () => faker.lorem.words(1), // Menos de 4 caracteres
    validName: () => faker.person.firstName() + ' ' + faker.person.lastName(), // Mais de 4 caracteres
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Autenticação', () => {
    it('deve retornar erro quando usuário não está autenticado', async () => {
      mockAuth.mockResolvedValue(null)
      const name = mockData.validName()
      const result = await changeName({ name })
      expect(result).toEqual({
        data: null,
        error: 'Usuário não autenticado',
      })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('deve retornar erro quando session não tem user', async () => {
      mockAuth.mockResolvedValue({})
      const name = mockData.validName()
      const result = await changeName({ name })
      expect(result).toEqual({
        data: null,
        error: 'Usuário não autenticado',
      })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('deve retornar erro quando user não tem id', async () => {
      mockAuth.mockResolvedValue({ user: {} })
      const name = mockData.validName()
      const result = await changeName({ name })
      expect(result).toEqual({
        data: null,
        error: 'Usuário não autenticado',
      })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('Validação de Schema', () => {
    it('deve retornar erro quando nome tem menos de 4 caracteres', async () => {
      const userId = mockData.userId()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      const shortName = 'abc'
      const result = await changeName({ name: shortName })
      expect(result).toEqual({
        data: null,
        error: 'O username precisa ter no mínimo 4 caracteres',
      })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('deve aceitar nome com exatamente 4 caracteres', async () => {
      const userId = mockData.userId()
      const updatedName = mockData.name()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockResolvedValue({ name: updatedName })
      const validName = 'João'
      const result = await changeName({ name: validName })
      expect(result).toEqual({
        data: updatedName,
        error: null,
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { name: validName },
      })
    })

    it('deve aceitar nomes com caracteres especiais', async () => {
      const userId = mockData.userId()
      const specialName = 'José María dos Santos-Silva'
      const updatedName = mockData.name()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockResolvedValue({ name: updatedName })
      const result = await changeName({ name: specialName })
      expect(result).toEqual({
        data: updatedName,
        error: null,
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { name: specialName },
      })
    })

    it('deve retornar erro para nome vazio', async () => {
      const userId = mockData.userId()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      const result = await changeName({ name: '' })
      expect(result).toEqual({
        data: null,
        error: 'O username precisa ter no mínimo 4 caracteres',
      })
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('Atualização no Banco de Dados', () => {
    it('deve atualizar nome com sucesso', async () => {
      const userId = mockData.userId()
      const name = mockData.validName()
      const updatedName = mockData.name()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockResolvedValue({ name: updatedName })
      const result = await changeName({ name })
      expect(result).toEqual({
        data: updatedName,
        error: null,
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { name },
      })
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve retornar erro quando falha ao atualizar no banco', async () => {
      const userId = mockData.userId()
      const name = mockData.validName()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockRejectedValue(new Error('Database error'))
      const result = await changeName({ name })
      expect(result).toEqual({
        data: null,
        error: 'Falha ao salvar alterações',
      })
    })

    it('deve lidar com erro de constraint único', async () => {
      const userId = mockData.userId()
      const name = mockData.validName()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockRejectedValue(new Error('Unique constraint violation'))
      const result = await changeName({ name })
      expect(result).toEqual({
        data: null,
        error: 'Falha ao salvar alterações',
      })
    })

    it('deve lidar com erro de conexão com banco', async () => {
      const userId = mockData.userId()
      const name = mockData.validName()
      mockAuth.mockResolvedValue({ user: { id: userId } })
      mockPrisma.user.update.mockRejectedValue(new Error('Connection failed'))
      const result = await changeName({ name })
      expect(result).toEqual({
        data: null,
        error: 'Falha ao salvar alterações',
      })
    })
  })
})
