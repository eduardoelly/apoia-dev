import { vi } from "vitest"
import { faker } from "@faker-js/faker"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { changeName } from "../_actions/change-name"
import { toast } from "sonner"
import { Name } from "./name"

// Mock do changeName
vi.mock("../_actions/change-name", () => ({
  changeName: vi.fn(),
}))

// Mock do toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const mockChangeName = changeName as jest.Mock
const mockToast = toast as any

describe("Name Component", () => {
  const mockData = {
    name: () => faker.person.fullName(),
    validName: () => faker.person.firstName() + " " + faker.person.lastName(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deve inicializar com o nome inicial", () => {
    const initialName = mockData.name()
    render(<Name initialName={initialName} />)

    const input = screen.getByPlaceholderText("Digite seu nome")
    expect(input).toHaveValue(initialName)
  })

  it("deve atualizar o nome com sucesso", async () => {
    const initialName = mockData.name()
    const newName = mockData.validName()

    mockChangeName.mockResolvedValueOnce({ error: null })

    render(<Name initialName={initialName} />)
    const input = screen.getByPlaceholderText("Digite seu nome")

    fireEvent.change(input, { target: { value: newName } })

    await waitFor(() => {
      expect(mockChangeName).toHaveBeenCalledWith({ name: newName })
      expect(mockToast.success).toHaveBeenCalledWith("Nome atualizado com sucesso!")
    }, { timeout: 1000 })
  })

  it("deve voltar para o nome original se o nome for vazio", async () => {
    const initialName = mockData.name()

    render(<Name initialName={initialName} />)
    const input = screen.getByPlaceholderText("Digite seu nome")

    fireEvent.change(input, { target: { value: "" } })

    await waitFor(() => {
      expect(input).toHaveValue(initialName)
    }, { timeout: 1000 })

    expect(mockToast.error).not.toHaveBeenCalled()
  })
})
