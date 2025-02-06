<template>
  <div
    ref="containerRef"
    :class="[isThumbnail ? 'thumbnail-view' : 'page-view']"
    :data-loaded="rendered"
  >
    <canvas ref="canvasRef" class="page-canvas"></canvas>
    <PageText v-if="!isThumbnail" :pageProxy="_pageProxy" :scale="scale" :rendered="rendered" />
  </div>
</template>

<script setup lang="ts">
import { PDFPageProxy } from "pdfjs-dist";
import { onMounted, ref, watch, toRaw, onUnmounted, computed } from "vue";
import PageText from "./PageText.vue";

const props = defineProps({
  pageNumber: { type: Number, required: true },
  pdfDocument: { type: Object, required: true },
  scale: { type: Number, default: 1 },
  maxScale: { type: Number, default: 4 },
  minPage: { type: Number, default: 0 },
  maxPage: { type: Number, default: 1 },
  isThumbnail: { type: Boolean, default: false }, // NEW: Determines full page vs. preview mode
});

const _size = ref({ width: 0, height: 0 });
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const _pageProxy = ref<PDFPageProxy | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);
const rendered = ref(false);
const renderTask = ref<{ cancel: () => void } | null>(null);
const _renderedCanvas = ref<HTMLCanvasElement | null>(null);

// **Calculate dynamic scale for thumbnails**
const dynamicScale = computed(() => {
  if (!canvasRef.value || _size.value.width === 0) return 1;
  return canvasRef.value.width / _size.value.width;
});

onMounted(async () => {
  if (canvasRef.value) {
    ctx.value = canvasRef.value.getContext("2d");
  }
});

onUnmounted(() => {
  if (_pageProxy.value) _pageProxy.value.cleanup();
  if (renderTask.value) renderTask.value.cancel();
});

watch(
  () => props.pdfDocument,
  async (newPdfDocument) => {
    if (!newPdfDocument) return;
    _pageProxy.value = await toRaw(newPdfDocument).getPage(props.pageNumber);
    initializeCanvas();
  },
  { immediate: true }
);

watch(
  () => [props.minPage, props.maxPage, _pageProxy.value],
  async ([newMinPage, newMaxPage, newProxy]) => {
    if (!newProxy) return;
    if (
      (props.pageNumber >= newMinPage && props.pageNumber <= newMaxPage) ||
      props.isThumbnail
    ) {
      if (!rendered.value) await renderPage();
    } else if (!props.isThumbnail) {
      clearCanvas();
    }
  }
);

watch(
  () => props.scale,
  (newScale) => {
    if (!props.isThumbnail) {
      resizeCanvas();
      if (rendered.value) {
        rendered.value = false;
        _renderedCanvas.value = null;
        renderPage();
      }
    }
  }
);

function initializeCanvas() {
  if (!_pageProxy.value || !canvasRef.value) return;

  const viewport = _pageProxy.value.getViewport({ scale: 1 });
  _size.value = { width: viewport.width, height: viewport.height };

  // Define thumbnail vs. full-page sizing
  const width = props.isThumbnail ? 100 : _size.value.width;
  const height = props.isThumbnail
    ? (100 / _size.value.width) * _size.value.height
    : _size.value.height;


  containerRef.value!.style.width = `${width}px`;
  containerRef.value!.style.height = `${height}px`;
  canvasRef.value!.style.width = `${width}px`;
  canvasRef.value!.style.height = `${height}px`;

  const dpr = props.isThumbnail ? 1 : window.devicePixelRatio;
  canvasRef.value!.width = width * dpr;
  canvasRef.value!.height = height * dpr;
}

async function renderPage() {
  if (!_pageProxy.value || !canvasRef.value) return;

  if (renderTask.value) {
    renderTask.value.cancel();
    renderTask.value = null;
  }

  if (!_renderedCanvas.value) {
    // **Use dynamic scaling for thumbnails, normal scale for full pages**
    const scale = props.isThumbnail
      ? dynamicScale.value
      : props.maxScale * window.devicePixelRatio;
    const viewport = _pageProxy.value.getViewport({ scale });

    canvasRef.value.width = viewport.width;
    canvasRef.value.height = viewport.height;

    const params = { canvasContext: ctx.value, viewport };
    renderTask.value = toRaw(_pageProxy.value).render(params);
    await toRaw(renderTask.value).promise;

    renderTask.value = null;
    rendered.value = true;
    _renderedCanvas.value = canvasRef.value;
  }

  if (!props.isThumbnail) {
    drawDownscaled();
  }
}

function drawDownscaled() {
  if (!_renderedCanvas.value) return;

  let ratio = props.scale / props.maxScale;
  let tempSource = _renderedCanvas.value;
  let tempTarget: HTMLCanvasElement;

  while (ratio < 0.5) {
    tempTarget = document.createElement("canvas");
    tempTarget.width = tempSource.width * 0.5;
    tempTarget.height = tempSource.height * 0.5;
    tempTarget
      .getContext("2d")!
      .drawImage(tempSource, 0, 0, tempTarget.width, tempTarget.height);
    tempSource = tempTarget;
    ratio *= 2;
  }

  ctx.value!.drawImage(
    tempSource,
    0,
    0,
    canvasRef.value!.width,
    canvasRef.value!.height
  );
}

function resizeCanvas() {
  const width = _size.value.width * props.scale;
  const height = _size.value.height * props.scale;

  if (containerRef.value) {
    containerRef.value.style.width = `${width}px`;
    containerRef.value.style.height = `${height}px`;
  }

  if (canvasRef.value) {
    canvasRef.value.style.width = `${width}px`;
    canvasRef.value.style.height = `${height}px`;

    const dpr = window.devicePixelRatio;
    canvasRef.value.width = width * dpr;
    canvasRef.value.height = height * dpr;
  }
}

function clearCanvas() {
  if (ctx.value && canvasRef.value) {
    ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    rendered.value = false;
    _renderedCanvas.value = null;
  }
}
</script>

<style scoped>
.page-view {
  position: relative;
  margin: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.75);
}
.thumbnail-view {
  position: relative;
  margin-bottom: 4px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.75);
}
.page-canvas {
  background-color: white;
}
</style>
