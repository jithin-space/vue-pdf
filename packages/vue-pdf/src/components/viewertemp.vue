<template>
    <div>
      <div class="viewer-container">
        <div class="viewer-panel-top">
          <h1>top panel</h1>
        </div>
        <div ref="_pagesContainer" class="page-container">
          <!-- PDF pages will be rendered here -->
        </div>
        <div class="viewer-panel-bottom">
          <div class="paginator">
            <button @click="onPaginatorPrev" :disabled="isPrevDisabled">prev</button>
            <button @click="onPaginatorNext" :disabled="isNextDisabled">next</button>
            <input
              type="number"
              v-model="inputPage"
              @input="filterInput"
              @change="onChange"
              placeholder="Enter page number"
            />
            <span>/</span>
            <span class="paginator-total"> {{ _pdfDocument?.numPages }}</span>
          </div>
          <div class="panel-separator"></div>
          <div id="zoomer" class="subpanel">
            <button>zoom out</button>
            <button>zoom in</button>
            <button>fit viewer</button>
            <button>fit page</button>
          </div>
        </div>
      </div>
      <div v-if="loading" ref="loadingLayer">
        <h1>currentPage: {{ _pageCurrent }}</h1>
        <slot />
      </div>
    </div>
  </template>
  
  <script lang="ts" setup>
  import { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
  import { RenderParameters } from "pdfjs-dist/types/src/display/api";
  import {
    onMounted,
    onUnmounted,
    ref,
    watch,
    toRaw,
    computed,
    nextTick,
  } from "vue";
  
  interface PageCanvas {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;
    renderTask: { cancel: () => void } | null;
    rendered: boolean;
  }
  
  const props = defineProps<{
    pdf?: PDFDocumentLoadingTask;
  }>();
  
  const loading = ref(false);
  
  // Private variables
  const _visibleAdjPages = 2;
  const _pagesContainer = ref<HTMLDivElement | null>(null);
  const _pageCanvases = ref<PageCanvas[]>([]);
  const _pdfDocument = ref<PDFDocumentProxy | null>(null);
  const _pagesVisible = ref<Set<number>>(new Set());
  const _pageCurrent = ref<number>(0);
  
  const isPrevDisabled = computed(() => _pageCurrent.value <= 0);
  const isNextDisabled = computed(
    () => _pageCurrent.value >= (_pdfDocument.value?.numPages || 1) - 1
  );
  const currentPageNumber = computed(() => _pageCurrent.value + 1);
  
  onMounted(async () => {
    if (props.pdf) await initDoc(props.pdf);
  });
  
  const inputPage = ref(1);
  
  async function initDoc(proxy: PDFDocumentLoadingTask) {
    const doc = await proxy.promise;
    await onPdfLoaded(doc);
  }
  
  async function onPdfLoaded(doc: PDFDocumentProxy) {
    _pdfDocument.value = doc;
    refreshPageCanvases();
    await refreshPageView();
  }
  
  function refreshPageCanvases() {
    _pageCanvases.value.forEach((x) => x.canvas.remove());
    _pageCanvases.value = [];
  
    const docPagesNumber = _pdfDocument.value?.numPages || 0;
    if (!docPagesNumber) {
      _pagesContainer.value?.removeEventListener(
        "scroll",
        onPagesContainerScroll
      );
      return;
    }
  
    for (let i = 0; i < docPagesNumber; i++) {
      const canvas = document.createElement("canvas");
      canvas.classList.add("page-canvas");
      canvas.height = 500;
      _pagesContainer.value?.append(canvas);
      _pageCanvases.value.push({
        canvas,
        ctx: canvas.getContext("2d"),
        rendered: false,
        renderTask: null,
      });
    }
  
    _pagesContainer.value?.addEventListener("scroll", onPagesContainerScroll);
  }
  
  const onPagesContainerScroll = async () => {
    await refreshPageView();
  };
  
  const refreshPageView = async () => {
    if (!_pagesContainer.value) return;
  
    _pagesVisible.value = getVisiblePages(
      _pagesContainer.value,
      _pageCanvases.value
    );
    _pageCurrent.value = getCurrentPage(
      _pagesContainer.value,
      _pageCanvases.value,
      _pagesVisible.value
    );
  
    console.log(_pagesVisible.value, _pageCurrent.value, "onrefreshPageview");
  
    await renderVisiblePagesAsync();
  };
  
  function getVisiblePages(
    container: HTMLDivElement,
    pageCanvases: PageCanvas[]
  ): Set<number> {
    const cRect = container.getBoundingClientRect();
    const pagesVisible = new Set<number>();
  
    pageCanvases.forEach((x, i) => {
      const pRect = x.canvas.getBoundingClientRect();
      if (pRect.top < cRect.bottom && pRect.bottom > cRect.top) {
        pagesVisible.add(i);
      }
    });
  
    return pagesVisible;
  }
  
  function getCurrentPage(
    container: HTMLDivElement,
    pageCanvases: PageCanvas[],
    visiblePages: Set<number>
  ): number {
    const visiblePageNumbers = [...visiblePages];
    if (!visiblePageNumbers.length) return 0;
    if (visiblePageNumbers.length === 1) return visiblePageNumbers[0];
  
    const containerRect = container.getBoundingClientRect();
    let maxArea = 0;
    let selectedPage = visiblePageNumbers[0];
  
    // Iterate over visible pages to find the one that covers the largest area
    visiblePageNumbers.forEach((pageIndex) => {
      const pageRect = pageCanvases[pageIndex].canvas.getBoundingClientRect();
  
      // Calculate the overlapping area between the page and the container
      const overlapTop = Math.max(
        0,
        Math.min(pageRect.bottom, containerRect.bottom) -
          Math.max(pageRect.top, containerRect.top)
      );
      const overlapLeft = Math.max(
        0,
        Math.min(pageRect.right, containerRect.right) -
          Math.max(pageRect.left, containerRect.left)
      );
  
      if (overlapTop > 0 && overlapLeft > 0) {
        const overlapArea = overlapTop * overlapLeft; // Area of overlap between page and container
        if (overlapArea > maxArea) {
          maxArea = overlapArea;
          selectedPage = pageIndex;
        }
      }
    });
  
    return selectedPage;
  }
  
  async function renderVisiblePagesAsync() {
    if (!_pdfDocument.value) return;
    const doc = _pdfDocument.value;
  
    const pageCanvases = _pageCanvases.value;
    const visiblePages = _pagesVisible.value;
  
    const minPage = Math.max(Math.min(...visiblePages) - _visibleAdjPages, 0);
    const maxPage = Math.min(
      Math.max(...visiblePages) + _visibleAdjPages,
      pageCanvases.length - 1
    );
  
    for (let i = 0; i < pageCanvases.length; i++) {
      if (i >= minPage && i <= maxPage) {
        if (!pageCanvases[i].rendered)
          await renderPageAsync(doc, pageCanvases, i);
      } else if (pageCanvases[i].rendered) {
        clearRenderedPage(pageCanvases, i);
      }
    }
  }
  
  async function renderPageAsync(
    doc: PDFDocumentProxy,
    pageCanvases: PageCanvas[],
    pageNumber: number,
    scale = 1
  ) {
    const pageCanvas = pageCanvases[pageNumber];
    if (pageCanvas.renderTask || !pageCanvas.ctx) return;
  
    const page = await toRaw(doc).getPage(pageNumber + 1);
    const viewport = page.getViewport({ scale });
    pageCanvas.canvas.width = viewport.width;
    pageCanvas.canvas.height = viewport.height;
  
    if (!pageCanvas.renderTask) {
      // create new render task only if there is no pending one
      const params = <RenderParameters>{
        canvasContext: pageCanvas.ctx,
        viewport,
      };
      const renderTask = page.render(params);
      pageCanvas.renderTask = renderTask;
      await renderTask.promise;
      pageCanvas.renderTask = null;
      pageCanvas.rendered = true;
    }
  }
  
  function clearRenderedPage(pageCanvases: PageCanvas[], pageNumber: number) {
    const pageCanvas = pageCanvases[pageNumber];
    if (pageCanvas.ctx) {
      pageCanvas.ctx.clearRect(
        0,
        0,
        pageCanvas.canvas.width,
        pageCanvas.canvas.height
      );
    }
    pageCanvas.rendered = false;
  }
  
  const onChange = () => {
    let newValue = parseInt(inputPage.value, 10);
  
    if (isNaN(newValue)) {
      inputPage.value = currentPageNumber.value.toString(); // Reset invalid input
      return;
    }
  
    // Clamp the page number within valid bounds
    const pageNumber = Math.max(
      Math.min(newValue - 1, (_pdfDocument.value?.numPages || 1) - 1),
      0
    );
  
    if (_pageCurrent.value !== pageNumber) {
      _pageCurrent.value = pageNumber;
      nextTick(() => scrollToPage(pageNumber));
    }
  
    inputPage.value = (pageNumber + 1).toString();
  };
  
  function scrollToPage(pageNumber: number) {
    console.log("pg", pageNumber);
    const { top: cTop } = _pagesContainer.value.getBoundingClientRect();
    const { top: pTop } =
      _pageCanvases.value[pageNumber].canvas.getBoundingClientRect();
  
    const scroll = pTop - (cTop - _pagesContainer.value.scrollTop);
    _pagesContainer.value.scrollTo(0, scroll);
    // _pageCurrent.value = pageNumber;
  }
  
  function onPaginatorPrev() {
    if (!isPrevDisabled.value) {
      const pageNumber = clamp(
        _pageCurrent.value - 1,
        0,
        _pdfDocument.value?.numPages
      );
  
      scrollToPage(pageNumber);
      inputPage.value = (pageNumber + 1).toString();
    }
  }
  
  function onPaginatorNext() {
    if (!isNextDisabled.value) {
      const pageNumber = clamp(
        _pageCurrent.value + 1,
        0,
        _pdfDocument.value?.numPages
      );
      scrollToPage(pageNumber);
      inputPage.value = (pageNumber + 1).toString();
    }
  }
  
  function clamp(v, min, max) {
    return Math.max(min, Math.min(v, max));
  }
  
  // Life cycle
  onUnmounted(() => {
    if (props.pdf && !props.pdf.destroyed) {
      props.pdf.destroy();
    }
  });
  
  watch(
    () => props.pdf,
    (pdf) => {
      if (pdf) initDoc(pdf);
    }
  );
  </script>
  
  <style scoped>
  .viewer-container {
    box-sizing: border-box;
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    align-items: stretch;
  
    overflow: auto;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    padding-top: 0;
    background-color: gray;
  }
  
  .viewer-panel-top {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    width: 100%;
    height: 40px;
    background: dimgray;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.75);
    z-index: 1;
    transition: height 0.25s ease-out 0.1s;
  }
  .panels-hidden .ts-pdf-viewer-panel-top {
    height: 0;
    transition: height 0.25s ease-in 0.1s;
  }
  
  .viewer-panel-bottom {
    position: absolute;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    flex-grow: 0;
    flex-shrink: 0;
    left: calc(50% - 160px);
    bottom: 10px;
    width: 320px;
    height: 40px;
    background: dimgray;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.75);
    z-index: 1;
    transition: height 0.25s ease-out, bottom 0.1s linear 0.25s;
  }
  .panels-hidden .viewer-panel-bottom {
    bottom: 0;
    height: 0;
    transition: bottom 0.1s linear, height 0.25s ease-in 0.1s;
  }
  
  .page-container {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    width: 100%;
    height: 100%;
    padding-top: 0px;
    overflow-x: auto;
    overflow-y: auto;
    transition: padding-top 0.25s ease-out 0.1s;
  }
  .panels-hidden .page-container {
    padding-top: 40px;
    transition: padding-top 0.25s ease-in 0.1s;
  }
  
  ::v-deep(.page-canvas) {
    margin: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.75);
    background-color: white;
  }
  
  /* paginator */
  .paginator {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    margin: 0 4px;
  }
  </style>
  