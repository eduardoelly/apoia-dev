export function createSlug(username: string): string {
  return username
    .normalize("NFD") // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, "") // Remove marcas diacríticas
    .replace(/[^a-zA-Z0-9\s-]/g, "-") // Remove caracteres especiais
    .replace(/\s+/g, "-") // Substitui espaços por hifens
    .replace(/-+/g, "-") // Remove hifens duplicados
    .toLowerCase() // Converte para minúsculas
    .trim();
}