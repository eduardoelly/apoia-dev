"use client"

import { debounce } from "lodash"
import { ChangeEvent, useRef, useState } from "react"
import { changeName } from "../_actions/change-name"
import { toast } from "sonner"

export function Name({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName)
  const [originalName] = useState(initialName)

  const debouncedName = useRef(
    debounce(async (currentName: string) => {
      if (currentName.trim() === "") {
        setName(originalName)
        return
      }

      if (currentName !== name) {
        try {
          const response = await changeName({ name: currentName })
          if (response.error) {
            toast.error(response.error)
            setName(originalName)
            return
          }

          toast.success("Nome atualizado com sucesso!")
        } catch (error) {
          setName(originalName)
        }
      }
    }, 500)
  ).current

  function handleChengeName(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setName(value);
    debouncedName(value);
  }

  return (
    <input
      className="text-xl md:text-2xl font-bold bg-gray-50 border border-gray-100 rounded-md outline-none p-2 w-full max-w-2xl text-center my-3"
      value={name}
      onChange={handleChengeName}
      placeholder="Digite seu nome"
    />
  )
}