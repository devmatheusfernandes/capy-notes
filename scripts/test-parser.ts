
function parseSearchQuery(query: string) {
  // 1. Substituir vírgulas e pontos por espaços (para facilitar a separação)
  const cleanQuery = query.replace(/[,\.]/g, " ");
  
  const terms: { term: string, exact: boolean }[] = [];
  
  // Regex para capturar:
  // 1. Texto entre aspas (simples ou duplas) -> Grupo 2
  // 2. Palavras soltas (sem aspas) -> Grupo 3
  const regex = /(['"])(.*?)\1|(\S+)/g;
  
  let match;
  while ((match = regex.exec(cleanQuery)) !== null) {
    if (match[2]) {
      // Veio de aspas (match[2])
      if (match[2].trim()) {
        terms.push({ term: match[2].trim(), exact: true });
      }
    } else if (match[3]) {
      // Palavra solta (match[3])
      if (match[3].trim()) {
        terms.push({ term: match[3].trim(), exact: false });
      }
    }
  }
  
  return terms;
}

const queries = [
  "'sal' terra",
  "'sal', 'terra'",
  "sal terra",
  '"sal" terra',
  "'sal da terra'", // frase exata
  "sal, terra",
  "'sal' 'terra'"
];

queries.forEach(q => {
  console.log(`Query: [${q}]`);
  console.log(parseSearchQuery(q));
  console.log("---");
});
