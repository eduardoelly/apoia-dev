"use client"

import { debounce } from "lodash"
import { ChangeEvent, useRef, useState } from "react"
import { changeBio } from "../_actions/change-bio"
import { toast } from "sonner"

export function Description({ initialDescription }: { initialDescription: string }) {
  const [description, setDescription] = useState(initialDescription)
  const [originalDescription] = useState(initialDescription)

  const debouncedName = useRef(
    debounce(async (currentDescription: string) => {
      if (currentDescription.trim() === "") {
        setDescription(originalDescription)
        return
      }

      if (currentDescription !== description) {
        try {
          const response = await changeBio({ description: currentDescription })
          if (response.error) {
            toast.error(response.error)
            setDescription(originalDescription)
            return
          }

          toast.success("Sua Bio foi atualizada com sucesso!")
        } catch (error) {
          setDescription(originalDescription)
        }
      }
    }, 500)
  ).current

  function handleChenge(e: ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setDescription(value);
    debouncedName(value);
  }

  return (
    <textarea
      className="text-base md:text-2xl bg-gray-50 border border-gray-100 rounded-md outline-none p-2 w-full max-w-2xl my-3 h-40 resize-none"
      value={description}
      onChange={handleChenge}
      placeholder="Digite sua biografia"
    />
  )
}