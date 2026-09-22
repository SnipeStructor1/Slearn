import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker } from 'tesseract.js';

const MAX_EXTRACTED_TEXT_LENGTH = 20_000;
const OCR_DPI = 200;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export type ExtractionProgress = {
  phase: 'text' | 'ocr';
  current: number;
  total: number;
};

export type ExtractionResult =
  | { status: 'text_extracted'; text: string }
  | { status: 'metadata_only' | 'failed'; text: ''; error: string };

type ProgressCallback = (progress: ExtractionProgress) => void;

async function runOcrOnCanvas(
  canvas: HTMLCanvasElement,
  worker: Awaited<ReturnType<typeof createWorker>>,
): Promise<string> {
  const { data } = await worker.recognize(canvas);
  return data.text.trim();
}

async function getOcrWorker(): Promise<Awaited<ReturnType<typeof createWorker>>> {
  return createWorker('eng+deu');
}

async function ocrImageFile(file: File, onProgress?: ProgressCallback): Promise<string> {
  onProgress?.({ phase: 'ocr', current: 0, total: 1 });
  const worker = await getOcrWorker();
  try {
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const text = await runOcrOnCanvas(canvas, worker);
    onProgress?.({ phase: 'ocr', current: 1, total: 1 });
    return text;
  } finally {
    await worker.terminate();
  }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

async function renderPdfPageToCanvas(
  pdfDocument: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>,
  pageNumber: number,
): Promise<HTMLCanvasElement> {
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale: OCR_DPI / 72 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas context unavailable');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

export async function extractFileText(
  file: File,
  onProgress?: ProgressCallback,
): Promise<ExtractionResult> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

  if (isImage) {
    try {
      const text = await ocrImageFile(file, onProgress);
      if (!text) {
        return { status: 'failed', text: '', error: 'Kein Text auf dem Foto erkannt. Stelle sicher, dass der Text gut lesbar ist.' };
      }
      return { status: 'text_extracted', text: text.slice(0, MAX_EXTRACTED_TEXT_LENGTH) };
    } catch {
      return { status: 'failed', text: '', error: 'Das Foto konnte nicht analysiert werden.' };
    }
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
    const pdfDocument = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;

    // Phase 1: try text-layer extraction
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' '));
      if (pages.join('\n').length >= MAX_EXTRACTED_TEXT_LENGTH) break;
    }
    const textLayerText = pages.join('\n').slice(0, MAX_EXTRACTED_TEXT_LENGTH).trim();

    if (textLayerText.length > 50) {
      return { status: 'text_extracted', text: textLayerText };
    }

    // Phase 2: PDF has little/no text layer — OCR each page as fallback
    const ocrPages = Math.min(pdfDocument.numPages, 10);
    const worker = await getOcrWorker();
    try {
      const ocrParts: string[] = [];
      for (let pageNumber = 1; pageNumber <= ocrPages; pageNumber += 1) {
        onProgress?.({ phase: 'ocr', current: pageNumber, total: ocrPages });
        const canvas = await renderPdfPageToCanvas(pdfDocument, pageNumber);
        const pageText = await runOcrOnCanvas(canvas, worker);
        if (pageText) ocrParts.push(pageText);
        if (ocrParts.join('\n').length >= MAX_EXTRACTED_TEXT_LENGTH) break;
      }
      const ocrText = ocrParts.join('\n').slice(0, MAX_EXTRACTED_TEXT_LENGTH).trim();
      if (!ocrText) {
        return { status: 'failed', text: '', error: 'Im PDF wurde kein Text gefunden — weder als Textebene noch über OCR.' };
      }
      return { status: 'text_extracted', text: ocrText };
    } finally {
      await worker.terminate();
    }
  } catch {
    return { status: 'failed', text: '', error: 'Das PDF konnte nicht sicher ausgelesen werden.' };
  }
}
