// usePdfLoader.ts
import * as PDFJS from "pdfjs-dist";
import PDFWorker from "pdfjs-dist/build/pdf.worker.min?url";
import type { Ref } from "vue";
import type { PDFSrc } from "../types";
import { isRef, shallowRef, watch } from "vue";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";

function configWorker(wokerSrc: string) {
  PDFJS.GlobalWorkerOptions.workerSrc = wokerSrc;
}

export function usePDFViewer(src: PDFSrc | Ref<PDFSrc>) {
  if (!PDFJS.GlobalWorkerOptions?.workerSrc) configWorker(PDFWorker);

  const pdf = shallowRef<PDFDocumentLoadingTask>();

  function processLoadingTask(source: PDFSrc) {
    pdf.value = PDFJS.getDocument(source!);
  }

  if (isRef(src)) {
    if (src.value) {
      processLoadingTask(src.value);
    }
    watch(src, () => {
      if (src.value) processLoadingTask(src.value);
    });
  } else {
    if (src) processLoadingTask(src);
  }

  return {
    pdf,
  };
}
