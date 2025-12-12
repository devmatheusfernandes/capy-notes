"use client";

import React, { useEffect, useRef } from "react";
import { parseAllReferences, formatReferenceTitle } from "../utils/bible-parse";
import { Editor } from "@tiptap/react";

type Item = { key: string; title: string; content: string };

interface BibleTextsCollectorProps {
  editor: Editor | null;
}

export default function BibleTextsCollectorTiptap({ editor }: BibleTextsCollectorProps) {
  
  // Cache para evitar requisições repetidas na mesma sessão
  const cacheRef = useRef(new Map<string, string>());

  useEffect(() => {
    if (!editor) return;

    // Função para buscar conteúdo (Reutilizada da lógica original)
    const fetchContentForInfo = async (info: {
      book: string;
      chapter: number;
      verse?: number;
      verses?: number[];
    }): Promise<{ title: string; content: string }> => {
      const selected = info.verse && !info.verses ? [info.verse] : info.verses ?? [];
      const cacheKey = `${info.book}|${info.chapter}|${
        selected.length ? selected.join(",") : "chapter"
      }`;
      
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        return {
          title: formatReferenceTitle(info, selected.length ? selected : undefined),
          content: cached,
        };
      }

      try {
        if (info.verse && !info.verses) {
          const params = new URLSearchParams({
            book: info.book,
            chapter: String(info.chapter),
            verse: String(info.verse),
          });
          const res = await fetch(`/api/bible?${params.toString()}`);
          const data = await res.json();
          const title = formatReferenceTitle(info);
          const content = data.text ?? "";
          cacheRef.current.set(cacheKey, content);
          return { title, content };
        } else {
          const params = new URLSearchParams({
            book: info.book,
            chapter: String(info.chapter),
          });
          const res = await fetch(`/api/bible?${params.toString()}`);
          const data = await res.json();
          const selectedVerses = selected.length > 0 ? selected : (data.verses as number[]);
          const byNumber = new Map<number, string>();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const item of data.content as { verse: number; text: string }[]) {
            byNumber.set(item.verse, item.text);
          }
          const lines: string[] = [];
          for (const v of selectedVerses) {
            const t = byNumber.get(v);
            if (t) lines.push(`${v}. ${t}`);
          }
          const title = formatReferenceTitle(info, selectedVerses);
          const content = lines.join("\n\n");
          cacheRef.current.set(cacheKey, content);
          return { title, content };
        }
      } catch (error) {
        console.error("Erro ao buscar bíblia:", error);
        return { title: formatReferenceTitle(info), content: "Erro ao carregar." };
      }
    };

    const performCollection = async () => {
      // 1. Escanear o documento Tiptap (Prosemirror Doc)
      const links: { key: string; text: string }[] = [];
      
      editor.state.doc.descendants((node, pos) => {
        if (node.isText) {
          // Verifica se tem marca de link e se o href começa com #bible
          const linkMark = node.marks.find((m) => m.type.name === "link");
          if (linkMark && linkMark.attrs.href?.startsWith("#bible")) {
            // Usamos a posição como "key" temporária. 
            // Nota: No Tiptap posições mudam com edições anteriores, mas para "snapshot" atual serve.
            links.push({ key: String(pos), text: node.text || "" });
          }
        }
      });

      // 2. Processar links encontrados
      try {
        const items: Item[] = [];
        for (const { key, text } of links) {
          const plain = text.replace(/\u00A0/g, " ");
          const infos = parseAllReferences(plain);
          
          for (const info of infos) {
            const { title, content } = await fetchContentForInfo(info);
            items.push({ key, title, content });
          }
        }
      } catch (e) {
        console.warn("[BibleTextsCollector] falha ao coletar textos:", e);
      }
    };

    // Listener de atualização do editor
    const handleUpdate = () => {
      // Pequeno debounce ou chamada direta
      void performCollection();
    };

    editor.on("update", handleUpdate);
    
    // Execução inicial
    void performCollection();

    // Listener para focar no nó (vindo da Sidebar)
    const onFocusReq = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      const keyStr = detail?.key;
      if (!keyStr) return;
      
      const pos = parseInt(keyStr, 10);
      if (isNaN(pos)) return;

      // No Tiptap focamos pela posição e scrollamos
      editor
        .chain()
        .focus()
        .setTextSelection(pos) // Coloca o cursor no início do link
        .scrollIntoView()
        .run();
    };

    window.addEventListener("editor-focus-node", onFocusReq as EventListener);

    return () => {
      editor.off("update", handleUpdate);
      window.removeEventListener("editor-focus-node", onFocusReq as EventListener);
    };
  }, [editor]);

  return null;
}