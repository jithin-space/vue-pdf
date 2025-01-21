<template>
  <div>
    <div class="viewer-container">
      <div class="viewer-panel-top">
        <h1>top panel</h1>
      </div>
      <div
        ref="_pagesContainer"
        class="page-container"
        @scroll="onPagesContainerScroll"
      >
        <PageCanvas
          v-for="pageNumber in totalPages"
          :key="pageNumber"
          :pageNumber="pageNumber"
          :pdfDocument="_pdfDocument"
          :scale="_scale || 1"
          :maxScale="_maxScale"
          :isVisible="_pagesVisible.has(pageNumber - 1)"
          :minPage="_minPageNumber"
          :maxPage="_maxPageNumber"
        />
      </div>
      <div class="viewer-panel-bottom">
        <div class="paginator">
          <button @click="onPaginatorPrev" :disabled="isPrevDisabled">
            prev
          </button>
          <button @click="onPaginatorNext" :disabled="isNextDisabled">
            next
          </button>
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
          <button @click="onZoomOut">zoom out</button>
          <button @click="onZoomIn">zoom in</button>
          <button @click="onZoomFitViewer">fit viewer</button>
          <button @click="onZoomFitPage">fit page</button>
        </div>
      </div>
    </div>
    <div v-if="loading" ref="loadingLayer">
      <h1>currentPage: {{ _pageCurrent }}</h1>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed, nextTick } from "vue";
import { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import PageCanvas from "./Page.vue";

const props = defineProps<{
  pdf?: PDFDocumentLoadingTask;
}>();
const loading = ref(false);

// Private variables
const _visibleAdjPages = 2;
const _minScale = 0.25;
const _maxScale = 4;
const _pagesContainer = ref<HTMLDivElement | null>(null);
const _pdfDocument = ref<PDFDocumentProxy | null>(null);
const _pagesVisible = ref<Set<number>>(new Set());
const _pageCurrent = ref<number>(0);
const _scale = ref<number>(1);
const _minPageNumber = ref<number>(0);
const _maxPageNumber = ref<number>(0);

const isPrevDisabled = computed(() => _pageCurrent.value <= 0);
const isNextDisabled = computed(
  () => _pageCurrent.value >= (_pdfDocument.value?.numPages || 1) - 1
);
const currentPageNumber = computed(() => _pageCurrent.value + 1);
const totalPages = computed(() => _pdfDocument.value?.numPages || 0);

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
  nextTick(() => {
    refreshPageView();
  });
  // await refreshPageView();
}

const onPagesContainerScroll = async () => {
  await refreshPageView();
};

const refreshPageView = async () => {
  if (!_pagesContainer.value) return;

  _pagesVisible.value = getVisiblePages(
    _pagesContainer.value,
    _pdfDocument.value?.numPages || 0
  );
  _pageCurrent.value = getCurrentPage(
    _pagesContainer.value,
    _pagesVisible.value
  );

  _minPageNumber.value = Math.max(
    Math.min(..._pagesVisible.value) - _visibleAdjPages,
    1
  );
  _maxPageNumber.value = Math.min(
    Math.max(..._pagesVisible.value) + _visibleAdjPages,
    _pdfDocument.value?.numPages || 1
  );
  // console.log(_pagesVisible.value, _pageCurrent.value, "onrefresh");
};

function getVisiblePages(
  container: HTMLDivElement,
  totalPages: number
): Set<number> {
  const cRect = container.getBoundingClientRect();
  const pagesVisible = new Set<number>();

  for (let i = 0; i < totalPages; i++) {
    const pageElement = container.children[i];
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
  visiblePageNumbers.forEach((pageIndex) => {
    const pageElement = container.children[pageIndex];
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
  const { top: cTop } = _pagesContainer.value.getBoundingClientRect();
  const { top: pTop } =
    _pagesContainer.value.children[pageNumber].getBoundingClientRect();

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

function onZoomOut() {
  _scale.value = clamp(_scale.value / 2, _minScale, _maxScale);
  // refreshPageView()
  // _scale.value = 1;
  nextTick(() => refreshPageView());
}

function onZoomIn() {
  _scale.value = clamp(_scale.value * 2, _minScale, _maxScale);
  nextTick(() => refreshPageView());
}

function onZoomFitPage() {
  if (
    !_pagesContainer.value ||
    !_pdfDocument.value ||
    !_pagesVisible.value.size
  ) {
    return;
  }

  const { width: cWidth, height: cHeight } =
    _pagesContainer.value.getBoundingClientRect();
  const { width: pWidth, height: pHeight } =
    _pagesContainer.value.children[_pageCurrent.value].getBoundingClientRect();
  const hScale = clamp(((cWidth - 20) / pWidth) * _scale.value, 0.1, _maxScale);
  const vScale = clamp(
    ((cHeight - 20) / pHeight) * _scale.value,
    0.1,
    _maxScale
  );
  _scale.value = Math.min(hScale, vScale);
  nextTick(() => refreshPageView());
}

function onZoomFitViewer() {
  if (
    !_pagesContainer.value ||
    !_pdfDocument.value ||
    !_pagesVisible.value.size
  ) {
    return;
  }

  const cWidth = _pagesContainer.value.getBoundingClientRect().width;
  const pWidth =
    _pagesContainer.value.children[_pageCurrent.value].getBoundingClientRect()
      .width;
  const scale = clamp(((cWidth - 20) / pWidth) * _scale.value, 0.1, _maxScale);
  _scale.value = scale;
  nextTick(() => refreshPageView());
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(v, max));
}

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
watch(_pageCurrent, (newVal) => {
  inputPage.value = newVal + 1;
});
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

/* paginator */
.paginator {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin: 0 4px;
}
</style>
