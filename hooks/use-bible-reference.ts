import { useState, useEffect } from 'react';

export interface BibleReferenceData {
  book: string;
  chapter: number;
  verse?: number;
  verses?: number[];
  text: string;
  content?: { verse: number; text: string }[];
  error?: string;
}

interface UseBibleReferenceProps {
  reference?: string;
  book?: string;
  chapter?: number | string;
  verse?: number | string;
  version?: string;
}

export function useBibleReference({ reference, book, chapter, verse, version }: UseBibleReferenceProps) {
  const [data, setData] = useState<BibleReferenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchRef = async () => {
      let b = book;
      let c = chapter;
      let v = verse;

      if (reference) {
        // Simple regex for "Book Chapter:Verse"
        // Supports "1 Reis 10:1", "João 3:16-18", etc.
        const match = reference.trim().match(/^(.+?)\s+(\d+)[:.](.+)$/);
        if (match) {
          b = match[1].trim();
          c = match[2];
          v = match[3];
        } else {
           // Maybe it's just Book Chapter?
           const matchChap = reference.trim().match(/^(.+?)\s+(\d+)$/);
           if (matchChap) {
             b = matchChap[1].trim();
             c = matchChap[2];
           }
        }
      }

      if (!b || !c) {
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        params.set('book', b);
        params.set('chapter', String(c));
        if (v) params.set('verse', String(v));
        if (version) params.set('version', version);

        const res = await fetch(`/api/bible?${params.toString()}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Failed to fetch bible reference');
        }

        if (active) {
          setData(json);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Error fetching bible reference');
          setData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchRef();

    return () => {
      active = false;
    };
  }, [reference, book, chapter, verse, version]);

  return { data, loading, error };
}
