<template>
  <div>
    <div class="viewer-container">
      <TopPanel />
      <div
        ref="_pagesContainer"
        class="page-container"
        @scroll="onPagesContainerScroll"
      >
        <PageCanvas
          v-for="pageNumber in _pageState.totalPages"
          :key="pageNumber"
          :pageNumber="pageNumber"
          :pdfDocument="_pdfDocument"
          :scale="_pageState.scale || 1"
          :maxScale="_maxScale"
          :minPage="_pageState.min"
          :maxPage="_pageState.max"
        />
      </div>
      <BottomPanel
        :currentPage="_pageState.current"
        :totalPages="_pageState.totalPages"
        :scrollToPage="scrollToPage"
        :onZoomFitPage="onZoomFitPage"
        :onZoomFitViewer="onZoomFitViewer"
        :onZoomIn="onZoomIn"
        :onZoomOut="onZoomOut"
      />
    </div>
    <div v-if="loading" ref="loadingLayer">
      <h1>currentPage: {{ _pageState.current }}</h1>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, nextTick, reactive } from "vue";
import { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import PageCanvas from "./Page.vue";
import TopPanel from "./TopPanel.vue";
import BottomPanel from "./BottomPanel.vue";
import _ from "lodash"; // TODO: can be replaced with vueuse

const props = defineProps<{
  pdf?: PDFDocumentLoadingTask | null;
}>();
const loading = ref(false);

// Private variables
const _visibleAdjPages = 2;
const _minScale = 0.25;
const _maxScale = 4;
const _pagesContainer = ref<HTMLDivElement | null>(null);
const _pdfDocument = ref<PDFDocumentProxy | null>(null);

const _pageState = reactive<{
  current: number;
  min: number;
  max: number;
  totalPages: number;
  scale: number;
  visiblePages: Set<number>;
}>({
  current: 0,
  min: 0,
  max: 0,
  totalPages: 0,
  scale: 1,
  visiblePages: new Set(),
});

onMounted(async () => {
  if (props.pdf) await initDoc(props.pdf);
});

async function initDoc(proxy: PDFDocumentLoadingTask) {
  const doc = await proxy.promise;
  await onPdfLoaded(doc);
}

async function onPdfLoaded(doc: PDFDocumentProxy) {
  _pdfDocument.value = doc;
  _pageState.totalPages = doc.numPages;
  nextTick(() => {
    refreshPageView();
  });
  // await refreshPageView();
}

const onPagesContainerScroll = _.debounce(async () => {
  await refreshPageView();
}, 10);

const refreshPageView = async () => {
  if (!_pagesContainer.value) return;

  const visiblePages = getVisiblePages(
    _pagesContainer.value,
    _pageState.totalPages
  );

  _pageState.current = getCurrentPage(_pagesContainer.value, visiblePages);
  _pageState.min = Math.max(Math.min(...visiblePages) - _visibleAdjPages, 1);
  _pageState.max = Math.min(
    Math.max(...visiblePages) + _visibleAdjPages,
    _pageState.totalPages
  );
  _pageState.visiblePages = new Set(visiblePages);

  // console.log(_pagesVisible.value, _pageCurrent.value, "onrefresh");
};

function getVisiblePages(
  container: HTMLDivElement,
  totalPages: number
): Set<number> {
  const cRect = container.getBoundingClientRect();
  const pagesVisible = new Set<number>();
  const children = Array.from(container.children);
  for (let i = 0; i < totalPages; i++) {
    const pageElement = children[i];
    // console.log(pageElement, "pagee");
    if (pageElement) {
      const pRect = pageElement.getBoundingClientRect();
      if (pRect.top < cRect.bottom && pRect.bottom > cRect.top) {
        pagesVisible.add(i);
      }
    }
  }

  return pagesVisible;
}
function getCurrentPage(
  container: HTMLDivElement,
  visiblePages: Set<number>
): number {
  const visiblePageNumbers = [...visiblePages];
  if (!visiblePageNumbers.length) return 0;
  if (visiblePageNumbers.length === 1) return visiblePageNumbers[0];

  const containerRect = container.getBoundingClientRect();
  let maxArea = 0;
  let selectedPage = visiblePageNumbers[0];

  // Iterate over visible pages to find the one that covers the largest area
  const children = Array.from(container.children);
  visiblePageNumbers.forEach((pageIndex) => {
    const pageElement = children[pageIndex];
    if (pageElement) {
      const pageRect = pageElement.getBoundingClientRect();

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
    }
  });

  return selectedPage;
}

function scrollToPage(pageNumber: number) {
  if (_pagesContainer.value) {
    const { top: cTop } = _pagesContainer.value.getBoundingClientRect();
    const { top: pTop } =
      _pagesContainer.value.children[pageNumber].getBoundingClientRect();

    const scroll = pTop - (cTop - _pagesContainer.value.scrollTop);
    _pagesContainer.value.scrollTo(0, scroll);
  }
}

function onZoomOut() {
  _pageState.scale = clamp(_pageState.scale / 2, _minScale, _maxScale);
  nextTick(() => refreshPageView());
}

function onZoomIn() {
  _pageState.scale = clamp(_pageState.scale * 2, _minScale, _maxScale);
  nextTick(() => refreshPageView());
}

function onZoomFitPage() {
  if (
    !_pagesContainer.value ||
    !_pdfDocument.value ||
    !_pageState.visiblePages.size
  ) {
    return;
  }

  const { width: cWidth, height: cHeight } =
    _pagesContainer.value.getBoundingClientRect();
  const { width: pWidth, height: pHeight } =
    _pagesContainer.value.children[_pageState.current].getBoundingClientRect();
  const hScale = clamp(
    ((cWidth - 20) / pWidth) * _pageState.scale,
    0.1,
    _maxScale
  );
  const vScale = clamp(
    ((cHeight - 20) / pHeight) * _pageState.scale,
    0.1,
    _maxScale
  );
  _pageState.scale = Math.min(hScale, vScale);
  nextTick(() => refreshPageView());
}

function onZoomFitViewer() {
  if (
    !_pagesContainer.value ||
    !_pdfDocument.value ||
    !_pageState.visiblePages.size
  ) {
    return;
  }

  const cWidth = _pagesContainer.value.getBoundingClientRect().width;
  const pWidth =
    _pagesContainer.value.children[_pageState.current].getBoundingClientRect()
      .width;
  const scale = clamp(
    ((cWidth - 20) / pWidth) * _pageState.scale,
    0.1,
    _maxScale
  );
  _pageState.scale = scale;
  nextTick(() => refreshPageView());
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(v, max));
}

onUnmounted(() => {
  onPagesContainerScroll.cancel(); // Cancel the debounced function
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

/* paginator */
.paginator {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin: 0 4px;
}
</style>
