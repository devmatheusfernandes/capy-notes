const STOPWORDS = new Set([
  "de","da","do","das","dos","a","o","e","em","para","por",
  "com","uma","um","que","se","na","no","as","os","é","ao",
  "ou", "eu", "tu", "me", "te", "se", "lhe", "nos", "vos", "só" // Adicionei algumas comuns de 2 letras
])

export function normalizeTerm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function tokenize(text: string): string[] {
  return Array.from(
    new Set(
      normalizeTerm(text)
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .split(" ")
        .filter(w =>
          w.length >= 2 && // <--- MUDANÇA: Agora aceita 2 ou mais letras
          !STOPWORDS.has(w)
        )
    )
  )
}