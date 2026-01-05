
const STORAGE_LIMITS = {
  pdf: 200 * 1024 * 1024,
  image: 100 * 1024 * 1024,
  backup: 50 * 1024 * 1024,
}

// Mock do estado atual (Simulação)
const mockStorage = {
  pdf: 50 * 1024 * 1024, // 50MB usados
  image: 90 * 1024 * 1024, // 90MB usados
  backup: 49 * 1024 * 1024, // 49MB usados
}

type StorageType = "pdf" | "image" | "backup"

function check(type: StorageType, newSize: number) {
    const limit = STORAGE_LIMITS[type]
    const current = mockStorage[type]
    const allowed = current + newSize <= limit
    
    console.log(`[${type.toUpperCase()}]`)
    console.log(`  Atual: ${(current/1024/1024).toFixed(2)} MB`)
    console.log(`  Novo : ${(newSize/1024/1024).toFixed(2)} MB`)
    console.log(`  Total: ${((current+newSize)/1024/1024).toFixed(2)} MB / ${(limit/1024/1024).toFixed(2)} MB`)
    console.log(`  Resultado: ${allowed ? "✅ PERMITIDO" : "❌ BLOQUEADO"}`)
    console.log('---')
    return allowed
}

// Executando Testes
console.log("=== INICIANDO TESTES DE LÓGICA DE COTAS ===\n")

// Teste PDF
check('pdf', 100 * 1024 * 1024) // Deve passar (150 < 200)
check('pdf', 160 * 1024 * 1024) // Deve falhar (210 > 200)

// Teste Imagem
check('image', 5 * 1024 * 1024) // Deve passar (95 < 100)
check('image', 15 * 1024 * 1024) // Deve falhar (105 > 100)

// Teste Backup
check('backup', 0.5 * 1024 * 1024) // Deve passar (49.5 < 50)
check('backup', 2 * 1024 * 1024) // Deve falhar (51 > 50)
