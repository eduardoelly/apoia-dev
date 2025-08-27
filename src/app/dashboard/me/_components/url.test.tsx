import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'

// Mock do createUsername
vi.mock('../_actions/create-username', () => ({
  createUsername: vi.fn(),
}))

import { createUsername } from '../_actions/create-username'

const mockCreateUsername = createUsername as any

// Hook para testar a lógica do UrlPreview component
function useUrlPreviewLogic(initialUsername: string | null) {
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState(initialUsername)

  async function submitAction(username: string) {
    if (username === "") {
      return
    }

    const response = await mockCreateUsername({ username })

    if (response.error) {
      setError(response.error)
      return
    }

    if (response.data !== null && response.data !== undefined) {
      setError(null) // Limpa erro em caso de sucesso
      setUsername(response.data)
    }
  }

  return {
    error,
    username,
    setError,
    setUsername,
    submitAction,
  }
}

describe('UrlPreview Component Logic', () => {
  const mockData = {
    username: () => faker.internet.username(),
    slug: () => faker.internet.username().toLowerCase(),
    validUsername: () => faker.internet.username() + '123',
    shortUsername: () => 'abc',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Estado Inicial', () => {
    it('deve inicializar com username null', () => {
      const { result } = renderHook(() => useUrlPreviewLogic(null))
      expect(result.current.username).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('deve inicializar com username existente', () => {
      const existingUsername = mockData.username()
      const { result } = renderHook(() => useUrlPreviewLogic(existingUsername))
      expect(result.current.username).toBe(existingUsername)
      expect(result.current.error).toBeNull()
    })

    it('deve inicializar com string vazia', () => {
      const { result } = renderHook(() => useUrlPreviewLogic(''))
      expect(result.current.username).toBe('')
      expect(result.current.error).toBeNull()
    })
  })

  describe('Função submitAction', () => {
    it('deve retornar early quando username é string vazia', async () => {
      const { result } = renderHook(() => useUrlPreviewLogic(null))
      await act(async () => {
        await result.current.submitAction('')
      })
      expect(mockCreateUsername).not.toHaveBeenCalled()
      expect(result.current.error).toBeNull()
      expect(result.current.username).toBeNull()
    })

    it('deve definir username quando createUsername retorna sucesso', async () => {
      const inputUsername = mockData.validUsername()
      const returnedSlug = mockData.slug()
      mockCreateUsername.mockResolvedValue({ data: returnedSlug, error: null })
      const { result } = renderHook(() => useUrlPreviewLogic(null))
      await act(async () => {
        await result.current.submitAction(inputUsername)
      })
      expect(mockCreateUsername).toHaveBeenCalledWith({ username: inputUsername })
      expect(result.current.username).toBe(returnedSlug)
      expect(result.current.error).toBeNull()
    })

    it('deve definir erro quando createUsername retorna erro', async () => {
      const inputUsername = mockData.validUsername()
      const errorMessage = 'Este username já está em uso.'
      mockCreateUsername.mockResolvedValue({ data: null, error: errorMessage })
      const { result } = renderHook(() => useUrlPreviewLogic(null))
      await act(async () => {
        await result.current.submitAction(inputUsername)
      })
      expect(mockCreateUsername).toHaveBeenCalledWith({ username: inputUsername })
      expect(result.current.username).toBeNull()
      expect(result.current.error).toBe(errorMessage)
    })

    it('deve limpar erro anterior ao fazer nova tentativa com sucesso', async () => {
      const inputUsername = mockData.validUsername()
      const returnedSlug = mockData.slug()
      const { result } = renderHook(() => useUrlPreviewLogic(null))
      act(() => {
        result.current.setError('Erro anterior')
      })
      mockCreateUsername.mockResolvedValue({ data: returnedSlug, error: null })
      await act(async () => {
        await result.current.submitAction(inputUsername)
      })

      expect(result.current.username).toBe(returnedSlug)
      expect(result.current.error).toBeNull() // Erro deve ser limpo implicitamente
    })

    it('deve lidar com caracteres especiais no username', async () => {
      const inputUsername = '@João_Silva-123'
      const returnedSlug = 'joao-silva-123'
      mockCreateUsername.mockResolvedValue({ data: returnedSlug, error: null })
      const { result } = renderHook(() => useUrlPreviewLogic(null))
      await act(async () => {
        await result.current.submitAction(inputUsername)
      })

      expect(mockCreateUsername).toHaveBeenCalledWith({ username: inputUsername })
      expect(result.current.username).toBe(returnedSlug)
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve lidar com erro de username muito curto', async () => {
      const shortUsername = mockData.shortUsername()
      const errorMessage = 'O username deve ter no mínimo 4 caracteres.'
      mockCreateUsername.mockResolvedValue({ data: null, error: errorMessage })
      const { result } = renderHook(() => useUrlPreviewLogic(null))
      await act(async () => {
        await result.current.submitAction(shortUsername)
      })

      expect(result.current.error).toBe(errorMessage)
      expect(result.current.username).toBeNull()
    })

    it('deve lidar com erro de username em uso', async () => {
      const username = mockData.validUsername()
      const errorMessage = 'Este username já está em uso.'
      mockCreateUsername.mockResolvedValue({ data: null, error: errorMessage })
      const { result } = renderHook(() => useUrlPreviewLogic(null))
      await act(async () => {
        await result.current.submitAction(username)
      })
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.username).toBeNull()
    })

    it('deve lidar com erro de falha na atualização', async () => {
      const username = mockData.validUsername()
      const errorMessage = 'Falha ao atualizar o username.'
      mockCreateUsername.mockResolvedValue({ data: null, error: errorMessage })
      const { result } = renderHook(() => useUrlPreviewLogic(null))
      await act(async () => {
        await result.current.submitAction(username)
      })
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.username).toBeNull()
    })

    it('deve lidar com exceção na chamada createUsername', async () => {
      const username = mockData.validUsername()
      mockCreateUsername.mockRejectedValue(new Error('Network error'))
      const { result } = renderHook(() => useUrlPreviewLogic(null))
      await act(async () => {
        await expect(result.current.submitAction(username)).rejects.toThrow('Network error')
      })
    })
  })
})
