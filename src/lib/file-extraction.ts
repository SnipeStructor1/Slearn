import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const MAX_EXTRACTED_TEXT_LENGTH = 20_000;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export type ExtractionResult =
  | { status: 'text_extracted'; text: string }
  | { status: 'metadata_only' | 'failed'; text: ''; error: string };

export async function extractFileText(file: File): Promise<ExtractionResult> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

  if (isImage) {
    return {
      status: 'failed',
      text: '',
      error: 'Foto-OCR ist in dieser Umgebung noch nicht verfügbar. Bitte füge den erkannten Text manuell ein.',
    };
  }

  if (!isPdf) {
    try {
      const text = (await file.text()).slice(0, MAX_EXTRACTED_TEXT_LENGTH).trim();
      return text
        ? { status: 'text_extracted', text }
        : { status: 'failed', text: '', error: 'Die Textdatei enthält keinen lesbaren Inhalt.' };
    } catch {
      return { status: 'failed', text: '', error: 'Die Textdatei konnte nicht gelesen werden.' };
    }
  }

  try {
    const document = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' '));
      if (pages.join('\n').length >= MAX_EXTRACTED_TEXT_LENGTH) break;
    }
    const text = pages.join('\n').slice(0, MAX_EXTRACTED_TEXT_LENGTH).trim();
    if (!text) {
      return {
        status: 'failed',
        text: '',
        error: 'Das PDF enthält keinen auslesbaren Text. Für gescannte Seiten wird Foto-OCR benötigt.',
      };
    }
    return { status: 'text_extracted', text };
  } catch {
    return { status: 'failed', text: '', error: 'Das PDF konnte nicht sicher ausgelesen werden.' };
  }
}

