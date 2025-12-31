
function normalizeStr(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const inputs = [
  "'SAL'",
  '"SAL"',
  "'sal'",
  " 'SAL' "
];

const texts = [
  "Salmo 23",
  "Gosto de sal na comida",
  "A salvação é importante",
  "água salgada"
];

inputs.forEach(input => {
    const trimmed = input.trim();
    const isExactMatch = /^["'].*["']$/.test(trimmed);
    console.log(`Input: [${input}], isExactMatch: ${isExactMatch}`);
    
    if (isExactMatch) {
        const term = trimmed.slice(1, -1);
        const normTerm = normalizeStr(term);
        console.log(`  Term: [${term}], NormTerm: [${normTerm}]`);
        
        texts.forEach(text => {
            const normText = normalizeStr(text);
            const regex = new RegExp(`\\b${escapeRegExp(normTerm)}\\b`);
            const match = regex.test(normText);
            console.log(`    Text: [${text}] -> Norm: [${normText}] -> Match: ${match}`);
        });
    }
});
