export const BIBLE_NAMES: Record<string, string> = {
  "ACF": "Almeida Corrigida Fiel",
  "ARA": "Almeida Revista e Atualizada",
  "ARC": "Almeida Revista e Corrigida",
  "AS21": "Almeida Século 21",
  "JFAA": "João Ferreira de Almeida Atualizada",
  "KJA": "King James Atualizada",
  "KJF": "King James Fiel",
  "NAA": "Nova Almeida Atualizada",
  "NBV": "Nova Bíblia Viva",
  "NTLH": "Nova Tradução na Linguagem de Hoje",
  "NVI": "Nova Versão Internacional",
  "NVT": "Nova Versão Transformadora",
  "TB": "Tradução Brasileira",
  "VULG": "Vulgata Latina",
  "nwt-pt": "Tradução do Novo Mundo"
};

export const VULGATE_TO_PT: Record<string, string> = {
  "Genesis": "Gênesis",
  "Exodus": "Êxodo",
  "Leviticus": "Levítico",
  "Numbers": "Números",
  "Deuteronomy": "Deuteronômio",
  "Joshua": "Josué",
  "Judges": "Juízes",
  "Ruth": "Rute",
  "I Samuel": "1 Samuel",
  "II Samuel": "2 Samuel",
  "I Kings": "1 Reis",
  "II Kings": "2 Reis",
  "I Chronicles": "1 Crônicas",
  "II Chronicles": "2 Crônicas",
  "Ezra": "Esdras",
  "Nehemiah": "Neemias",
  "Tobit": "Tobias",
  "Judith": "Judite",
  "Esther": "Ester",
  "Job": "Jó",
  "Psalms": "Salmos",
  "Proverbs": "Provérbios",
  "Ecclesiastes": "Eclesiastes",
  "Song of Solomon": "Cântico de Salomão", // Changed to match likely existing name or use "Cânticos"
  "Wisdom": "Sabedoria",
  "Sirach": "Eclesiástico",
  "Isaiah": "Isaías",
  "Jeremiah": "Jeremias",
  "Lamentations": "Lamentações",
  "Baruch": "Baruque",
  "Ezekiel": "Ezequiel",
  "Daniel": "Daniel",
  "Hosea": "Oseias",
  "Joel": "Joel",
  "Amos": "Amós",
  "Obadiah": "Obadias",
  "Jonah": "Jonas",
  "Micah": "Miqueias",
  "Nahum": "Naum",
  "Habakkuk": "Habacuque",
  "Zephaniah": "Sofonias",
  "Haggai": "Ageu",
  "Zechariah": "Zacarias",
  "Malachi": "Malaquias",
  "I Maccabees": "1 Macabeus",
  "II Maccabees": "2 Macabeus",
  "Matthew": "Mateus",
  "Mark": "Marcos",
  "Luke": "Lucas",
  "John": "João",
  "Acts": "Atos",
  "Romans": "Romanos",
  "I Corinthians": "1 Coríntios",
  "II Corinthians": "2 Coríntios",
  "Galatians": "Gálatas",
  "Ephesians": "Efésios",
  "Philippians": "Filipenses",
  "Colossians": "Colossenses",
  "I Thessalonians": "1 Tessalonicenses",
  "II Thessalonians": "2 Tessalonicenses",
  "I Timothy": "1 Timóteo",
  "II Timothy": "2 Timóteo",
  "Titus": "Tito",
  "Philemon": "Filemom",
  "Hebrews": "Hebreus",
  "James": "Tiago",
  "I Peter": "1 Pedro",
  "II Peter": "2 Pedro",
  "I John": "1 João",
  "II John": "2 João",
  "III John": "3 João",
  "Jude": "Judas",
  "Revelation of John": "Apocalipse",
  "Prayer of Manasses": "Oração de Manassés",
  "I Esdras": "1 Esdras",
  "II Esdras": "2 Esdras",
  "Additional Psalm": "Salmo 151",
  "Laodiceans": "Laodicenses"
};

// Reverse mapping plus aliases
export const PT_TO_VULGATE: Record<string, string> = {};

// Populate reverse map
for (const [eng, pt] of Object.entries(VULGATE_TO_PT)) {
  PT_TO_VULGATE[pt] = eng;
}

// Add aliases commonly used in PT bibles
PT_TO_VULGATE["Revelação"] = "Revelation of John";
PT_TO_VULGATE["Cânticos"] = "Song of Solomon";
PT_TO_VULGATE["Cântico dos Cânticos"] = "Song of Solomon";
PT_TO_VULGATE["Cantares"] = "Song of Solomon";
PT_TO_VULGATE["Oséias"] = "Hosea"; // Accent variation
PT_TO_VULGATE["Miquéias"] = "Micah"; // Accent variation
PT_TO_VULGATE["Atos dos Apóstolos"] = "Acts";

// Mappings for NWT (Tradução do Novo Mundo) discrepancies
export const NWT_TO_PT: Record<string, string> = {
  "Salmo": "Salmos"
};

export const PT_TO_NWT: Record<string, string> = {
  "Salmos": "Salmo"
};
