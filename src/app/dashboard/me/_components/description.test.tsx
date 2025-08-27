import { vi } from "vitest"
import { faker } from "@faker-js/faker"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { changeBio } from "../_actions/change-bio"
import { toast } from "sonner"
import { Description } from "./description"

// Mock do changeBio
vi.mock("../_actions/change-bio", () => ({
  changeBio: vi.fn(),
}))

// Mock do toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock do debounce -> executa imediatamente
vi.mock("lodash", () => ({
  debounce: (fn: Function) => fn,
}))

const mockChangeBio = changeBio as jest.Mock
const mockToast = toast as any

describe("Description Component", () => {
  const mockData = {
    description: () => faker.lorem.paragraph(),
    newDescription: () => faker.lorem.sentence(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deve atualizar a descrição com sucesso", async () => {
    const initialDescription = mockData.description()
    const newDescription = mockData.newDescription()

    mockChangeBio.mockResolvedValueOnce({ error: null })

    render(<Description initialDescription={initialDescription} />)
    const textarea = screen.getByPlaceholderText("Digite sua biografia")

    fireEvent.change(textarea, { target: { value: newDescription } })

    await waitFor(() => {
      expect(mockChangeBio).toHaveBeenCalledWith({ description: newDescription })
      expect(mockToast.success).toHaveBeenCalledWith("Sua Bio foi atualizada com sucesso!")
    }, { timeout: 1000 })
  })

  it("deve voltar para a descrição original se a API retornar erro", async () => {
    const initialDescription = mockData.description()
    const invalidDescription = "### inválida"

    mockChangeBio.mockResolvedValueOnce({ error: "Descrição inválida" })

    render(<Description initialDescription={initialDescription} />)
    const textarea = screen.getByPlaceholderText("Digite sua biografia")

    fireEvent.change(textarea, { target: { value: invalidDescription } })

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Descrição inválida")
      expect(textarea).toHaveValue(initialDescription)
    }, { timeout: 1000 })
  })

  it("deve voltar para a descrição original se o usuário limpar o campo", async () => {
    const initialDescription = mockData.description()

    render(<Description initialDescription={initialDescription} />)
    const textarea = screen.getByPlaceholderText("Digite sua biografia")

    fireEvent.change(textarea, { target: { value: "" } })

    await waitFor(() => {
      expect(textarea).toHaveValue(initialDescription)
    }, { timeout: 1000 })

    expect(mockChangeBio).not.toHaveBeenCalled()
    expect(mockToast.error).not.toHaveBeenCalled()
    expect(mockToast.success).not.toHaveBeenCalled()
  })
})
