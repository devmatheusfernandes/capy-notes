import { NoteData } from "@/types";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Typography from "@tiptap/extension-typography";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const extensions = [
  StarterKit,
  Image,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight,
  Subscript,
  Superscript,
  Typography,
];

export function generateNoteHTML(note: NoteData): string {
  if (!note.content) return "";
  
  // Se for string (legado ou erro), retorna como parágrafo
  if (typeof note.content === "string") {
    return `<p>${note.content}</p>`;
  }

  try {
    return generateHTML(note.content as any, extensions);
  } catch (e) {
    console.error("Erro ao gerar HTML da nota", e);
    return "";
  }
}

export async function exportToPDF(note: NoteData) {
  const htmlContent = generateNoteHTML(note);
  const title = note.title || "Sem título";

  // Criar iframe oculto para isolar o CSS
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.width = "800px";
  iframe.style.height = "1000px";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("Não foi possível acessar o documento do iframe");

    // Adicionar título e data e estilos básicos
    const header = `
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: white;
          color: black;
          padding: 40px;
          width: 800px; /* Largura fixa para A4 */
        }
        h1 {
          font-size: 24px;
          margin-bottom: 10px;
          border-bottom: 2px solid #ccc;
          padding-bottom: 10px;
        }
        .meta {
          font-size: 12px;
          color: #666;
          margin-bottom: 30px;
        }
        /* Resets básicos para garantir que o html2canvas não pegue nada estranho */
        * {
          box-sizing: border-box;
        }
      </style>
      <h1>${title}</h1>
      <p class="meta">
        Criado em: ${new Date(note.createdAt).toLocaleDateString()}
      </p>
    `;

    doc.open();
    doc.write(header + htmlContent);
    doc.close();

    // Esperar renderização básica (imagens, etc)
    await new Promise((resolve) => setTimeout(resolve, 500));

    const canvas = await html2canvas(doc.body, {
      scale: 1.5, // Reduzido de 2 para 1.5 (bom equilíbrio entre qualidade e tamanho)
      useCORS: true, 
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 800,
      windowHeight: doc.body.scrollHeight + 100 
    });

    // Usar JPEG com compressão em vez de PNG
    const imgData = canvas.toDataURL("image/jpeg", 0.75); // Qualidade 75%
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true // Habilitar compressão interna do PDF
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    
    // Configurações de margem (em mm)
    const marginTop = 15;
    const marginBottom = 15;
    const marginLeft = 10;
    const marginRight = 10;

    const contentWidth = imgWidth - marginLeft - marginRight;
    const contentHeight = pageHeight - marginTop - marginBottom;

    const imgHeight = (canvas.height * contentWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = marginTop; // Primeira página começa na margem superior

    pdf.addImage(imgData, "JPEG", marginLeft, position, contentWidth, imgHeight, undefined, "FAST");
    heightLeft -= contentHeight;

    while (heightLeft > 0) {
      position -= contentHeight; // Move a imagem para cima pelo tamanho do conteúdo visível
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", marginLeft, position, contentWidth, imgHeight, undefined, "FAST");
      heightLeft -= contentHeight;
    }

    pdf.save(`${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`);
  } catch (error) {
    console.error("Erro ao exportar PDF:", error);
    throw error;
  } finally {
    document.body.removeChild(iframe);
  }
}

export async function exportToODT(note: NoteData) {
  const zip = new JSZip();
  const title = note.title || "Sem título";
  const htmlContent = generateNoteHTML(note);

  // Mimetype (deve ser o primeiro e sem compressão)
  zip.file("mimetype", "application/vnd.oasis.opendocument.text", { compression: "STORE" });

  // Manifest
  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
 <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>
 <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
 <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
 <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;
  zip.folder("META-INF")?.file("manifest.xml", manifestXml);

  // Converter HTML para ODT XML
  let odtBody = htmlContent
    // Substituir entidades HTML comuns que não são válidas em XML estrito ou mapear para unicode
    .replace(/&nbsp;/g, "&#160;")
    // Tags de parágrafo e headings (ignorando atributos)
    .replace(/<p[^>]*>/g, '<text:p text:style-name="Standard">')
    .replace(/<\/p>/g, '</text:p>')
    .replace(/<h1[^>]*>/g, '<text:h text:style-name="Heading_20_1" text:outline-level="1">')
    .replace(/<\/h1>/g, '</text:h>')
    .replace(/<h2[^>]*>/g, '<text:h text:style-name="Heading_20_2" text:outline-level="2">')
    .replace(/<\/h2>/g, '</text:h>')
    .replace(/<h3[^>]*>/g, '<text:h text:style-name="Heading_20_3" text:outline-level="3">')
    .replace(/<\/h3>/g, '</text:h>')
    // Formatação de texto
    .replace(/<strong[^>]*>/g, '<text:span text:style-name="Bold">')
    .replace(/<\/strong>/g, '</text:span>')
    .replace(/<b[^>]*>/g, '<text:span text:style-name="Bold">')
    .replace(/<\/b>/g, '</text:span>')
    .replace(/<em[^>]*>/g, '<text:span text:style-name="Italic">')
    .replace(/<\/em>/g, '</text:span>')
    .replace(/<i[^>]*>/g, '<text:span text:style-name="Italic">')
    .replace(/<\/i>/g, '</text:span>')
    // Listas
    .replace(/<ul[^>]*>/g, '<text:list text:style-name="L1">')
    .replace(/<\/ul>/g, '</text:list>')
    .replace(/<ol[^>]*>/g, '<text:list text:style-name="L1">')
    .replace(/<\/ol>/g, '</text:list>')
    .replace(/<li[^>]*>/g, '<text:list-item><text:p text:style-name="Standard">')
    .replace(/<\/li>/g, '</text:p></text:list-item>')
    // Quebras de linha
    .replace(/<br\s*\/?>/g, '<text:line-break/>')
    // Remover imagens por enquanto (complexo lidar com base64 no ODT simples)
    .replace(/<img[^>]*>/g, '')
    // Remover tags restantes que não conhecemos, preservando o conteúdo
    // CUIDADO: Isso pode remover tags que deveriam ser tratadas.
    // Melhor remover apenas tags específicas ou deixar como está se for texto.
    // Vamos remover div e span genéricos que sobraram
    .replace(/<div[^>]*>/g, '')
    .replace(/<\/div>/g, '')
    .replace(/<span[^>]*>/g, '')
    .replace(/<\/span>/g, '');

  // Content XML
  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:dr3d="urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0" xmlns:math="http://www.w3.org/1998/Math/MathML" xmlns:form="urn:oasis:names:tc:opendocument:xmlns:form:1.0" xmlns:script="urn:oasis:names:tc:opendocument:xmlns:script:1.0" xmlns:ooo="http://openoffice.org/2004/office" xmlns:ooow="http://openoffice.org/2004/writer" xmlns:oooc="http://openoffice.org/2004/calc" xmlns:dom="http://www.w3.org/2001/xml-events" xmlns:xforms="http://www.w3.org/2002/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:rpt="http://openoffice.org/2005/report" xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:grddl="http://www.w3.org/2003/g/data-view#" xmlns:tableooo="http://openoffice.org/2009/table" xmlns:field="urn:openoffice:names:experimental:ooo-ms-interop:xmlns:field:1.0" office:version="1.2">
  <office:scripts/>
  <office:font-face-decls>
    <style:font-face style:name="Arial" svg:font-family="Arial" style:font-family-generic="swiss" style:font-pitch="variable"/>
  </office:font-face-decls>
  <office:automatic-styles>
    <style:style style:name="Bold" style:family="text">
      <style:text-properties fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold"/>
    </style:style>
    <style:style style:name="Italic" style:family="text">
      <style:text-properties fo:font-style="italic" style:font-style-asian="italic" style:font-style-complex="italic"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
      <text:h text:style-name="Heading_20_1" text:outline-level="1">${title}</text:h>
      <text:p text:style-name="Standard" />
      ${odtBody}
    </office:text>
  </office:body>
</office:document-content>`;

  zip.file("content.xml", contentXml);

  // Styles XML (Mínimo)
  const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2">
  <office:styles>
    <style:style style:name="Standard" style:family="paragraph" style:class="text"/>
    <style:style style:name="Heading" style:family="paragraph" style:parent-style-name="Standard" style:next-style-name="Standard" style:class="text">
      <style:text-properties fo:font-size="14pt" fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="Heading_20_1" style:display-name="Heading 1" style:family="paragraph" style:parent-style-name="Heading" style:next-style-name="Standard" style:class="text" style:default-outline-level="1">
      <style:text-properties fo:font-size="130%" fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="Heading_20_2" style:display-name="Heading 2" style:family="paragraph" style:parent-style-name="Heading" style:next-style-name="Standard" style:class="text" style:default-outline-level="2">
      <style:text-properties fo:font-size="115%" fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="Heading_20_3" style:display-name="Heading 3" style:family="paragraph" style:parent-style-name="Heading" style:next-style-name="Standard" style:class="text" style:default-outline-level="3">
      <style:text-properties fo:font-size="105%" fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="L1" style:family="list">
      <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="0.5in" fo:text-indent="-0.25in" fo:margin-left="0.5in"/>
      </style:list-level-properties>
    </style:style>
  </office:styles>
</office:document-styles>`;

  zip.file("styles.xml", stylesXml);
  
  // Meta XML
  const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.2">
  <office:meta>
    <dc:title>${title}</dc:title>
    <dc:date>${new Date().toISOString()}</dc:date>
  </office:meta>
</office:document-meta>`;
  zip.file("meta.xml", metaXml);

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.odt`);
}
