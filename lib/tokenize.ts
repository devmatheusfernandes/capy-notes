const STOPWORDS = new Set([
  "de","da","do","das","dos","a","o","e","em","para","por",
  "com","uma","um","que","se","na","no","as","os","é","ao"
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
          w.length >= 4 &&
          !STOPWORDS.has(w)
        )
    )
  )
}
