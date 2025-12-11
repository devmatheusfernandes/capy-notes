import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { NoteData, TagData } from "@/types";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- HELPERS ---
// 1. Extrai a primeira imagem para usar como capa
export function getCoverImage(note: NoteData): string | null {
  try {
    const content: any = note.content;
    const blocks = content?.content || [];
    
    // Procura no primeiro nível ou dentro de blocos
    for (const block of blocks) {
      if (block.type === "image" && block.attrs?.src) {
        return block.attrs.src;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// 2. Extrai itens de checklist para exibição
interface TaskItem { label: string; checked: boolean }

export function getChecklistItems(note: NoteData, max = 5): TaskItem[] {
  try {
    const content: any = note.content;
    const items: TaskItem[] = [];
    
    const traverse = (nodes: any[]) => {
      for (const node of nodes) {
        if (items.length >= max) return; // Otimização: para se já tiver o suficiente

        if (node.type === "taskList") {
           node.content?.forEach((task: any) => {
              if (task.type === "taskItem") {
                 // Pega o texto do primeiro parágrafo dentro do item
                 const text = task.content?.[0]?.content?.[0]?.text || "";
                 // Mesmo vazio, se existe, é um item
                 items.push({ 
                   label: text, 
                   checked: task.attrs?.checked ?? false 
                 });
              }
           });
        } else if (node.content) {
          traverse(node.content);
        }
      }
    };
    
    traverse(content?.content || []);
    return items.slice(0, max);
  } catch {
    return [];
  }
}

// 3. Atualiza o JSON da nota alternando o status de um item específico
export function toggleNoteChecklistItem(note: NoteData, itemIndex: number): any {
  // Deep clone para segurança
  const newContent = JSON.parse(JSON.stringify(note.content));
  
  let currentIndex = 0;
  let found = false;

  const traverseAndToggle = (nodes: any[]) => {
    for (const node of nodes) {
      if (found) return;

      if (node.type === "taskList") {
        if (node.content) traverseAndToggle(node.content);
      } else if (node.type === "taskItem") {
        if (currentIndex === itemIndex) {
          // Inverte o checked
          const isChecked = node.attrs?.checked ?? false;
          // Garante que attrs existe
          node.attrs = { ...node.attrs, checked: !isChecked };
          found = true;
          return;
        }
        currentIndex++;
      } else if (node.content) {
        traverseAndToggle(node.content);
      }
    }
  };

  traverseAndToggle(newContent.content || []);
  return newContent;
}

// 4. Helper de texto simples (já existia, mantido para fallback)
export function getPreviewText(note: NoteData, max = 250): string {
  try {
    const c: any = note.content as any;
    const blocks = c?.content || [];
    for (const b of blocks) {
      // Ignora imagens e tasks na preview de texto
      if (b.type === "image" || b.type === "taskList") continue;

      const texts: string[] = [];
      const collect = (node: any) => {
        if (!node) return;
        if (typeof node.text === "string") texts.push(node.text);
        if (Array.isArray(node.content)) node.content.forEach(collect);
      };
      collect(b);
      const t = texts.join(" ").trim();
      if (t) return t.length > max ? t.slice(0, max) + "…" : t;
    }
    return "";
  } catch {
    return "";
  }
}