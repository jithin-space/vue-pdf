<template>
  <div ref="containerRef" class="page">
    <canvas ref="canvasRef" class="page-canvas" height="500"></canvas>
  </div>
</template>

<script setup lang="ts">
import { PDFPageProxy } from "pdfjs-dist";
import {
  onMounted,
  ref,
  watch,
  toRaw,
  watchEffect,
  render,
  onUnmounted,
} from "vue";

const props = defineProps({
  pageNumber: {
    type: Number,
    required: true,
  },
  pdfDocument: {
    type: Object,
    required: true,
  },
  isVisible: {
    type: Boolean,
    default: false,
  },
  scale: {
    type: Number,
    default: 1,
  },
  maxScale: {
    type: Number,
    default: 4,
  },
  minPage: {
    type: Number,
    default: 0,
  },
  maxPage: {
    type: Number,
    default: 1,
  },
});

const _scale = ref(props.scale);
const _maxScale = ref(props.maxScale);
const _size = ref({ width: 0, height: 0 });
const canvasRef = ref(null);
const containerRef = ref(null);
const _pageProxy = ref<PDFPageProxy | null>(null);
const ctx = ref(null);
const rendered = ref(false);
const renderTask = ref<{ cancel: () => void } | null>(null);
const _renderedCanvas = ref<HTMLCanvasElement | null>(null);

onMounted(async () => {
  ctx.value = canvasRef.value.getContext("2d");
});

watch(
  () => props.pdfDocument,
  async (newPdfDocument) => {
    if (!newPdfDocument) return;
    if (!_pageProxy.value) {
      _pageProxy.value = await toRaw(newPdfDocument).getPage(props.pageNumber);
      const viewport = _pageProxy.value.getViewport({ scale: 1 });
      _size.value = { width: viewport.width, height: viewport.height };
      const width = _size.value.width;
      const height = _size.value.height;
      containerRef.value.style.width = width + "px";
      containerRef.value.style.height = height + "px";
      canvasRef.value.style.width = width + "px";
      canvasRef.value.style.height = height + "px";

      const dpr = window.devicePixelRatio;
      canvasRef.value.width = width * dpr;
      canvasRef.value.height = height * dpr;
    }

    //  console.log(props.pageNumber, "onEffect", _pageProxy.value);
  },
  { immediate: true } // Run on initial setup
);

watch(
  () => [props.minPage, props.maxPage, _pageProxy.value],
  async ([newMinPage, newMaxPage, newProxy]) => {
    if (!newProxy) return;
    if (props.pageNumber >= newMinPage && props.pageNumber <= newMaxPage) {
      if (!rendered.value) {
        // console.log('rendering', props.pageNumber, props.minPage, props.maxPage);
        await renderPage(); // Avoid `await` if renderPage isn't returning a promise.
      }
    } else {
      clear();
    }
  }
);

watch(
  () => props.scale,
  (newScale, oldScale) => {
    console.log(newScale, _scale.value, oldScale, "onScale");

    _scale.value = newScale;
    const width = _size.value.width * _scale.value;
    const height = _size.value.height * _scale.value;
    containerRef.value.style.width = width + "px";
    containerRef.value.style.height = height + "px";
    canvasRef.value.style.width = width + "px";
    canvasRef.value.style.height = height + "px";

    const dpr = window.devicePixelRatio;
    canvasRef.value.width = width * dpr;
    canvasRef.value.height = height * dpr;

    if (rendered.value) {
      rendered.value = false;
      _renderedCanvas.value = null;
      renderPage();
    }
  }
);

onUnmounted(() => {
  _pageProxy.value?.cleanup();
});

async function renderPage() {
  if (!_pageProxy.value) return;

  if (renderTask.value) {
    renderTask.value.cancel();
    renderTask.value = null;
  }

  if (!_renderedCanvas.value) {
    console.log("rendinrg", props.pageNumber, _pageProxy.value);

    const viewport = _pageProxy.value.getViewport({
      scale: _maxScale.value * window.devicePixelRatio,
    });
    // _size.value = { width: viewport.width, height: viewport.height };
    canvasRef.value.width = viewport.width;
    canvasRef.value.height = viewport.height;
    const params = {
      canvasContext: ctx.value,
      viewport,
    };
    renderTask.value = toRaw(_pageProxy.value).render(params);
    await toRaw(renderTask.value).promise;
    renderTask.value = null;
    rendered.value = true;
    _renderedCanvas.value = canvasRef.value;
  }

  drawDownscaled();
}

function drawDownscaled() {
  if (!_renderedCanvas.value) return;

  let ratio = _scale.value / _maxScale.value;
  let tempSource = _renderedCanvas.value;
  let tempTarget: HTMLCanvasElement;

  while (ratio < 0.5) {
    console.log("sown dsmapling");
    tempTarget = document.createElement("canvas");
    tempTarget.width = tempSource.width * 0.5;
    tempTarget.height = tempSource.height * 0.5;
    tempTarget
      .getContext("2d")
      .drawImage(tempSource, 0, 0, tempTarget.width, tempTarget.height);

    tempSource = tempTarget;
    ratio *= 2;
  }


  ctx.value.drawImage(
    tempSource,
    0,
    0,
    canvasRef.value.width,
    canvasRef.value.height
  );
}

function clear() {
  if (ctx.value) {
    ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    rendered.value = false;
    _renderedCanvas.value = null;
  }
}
</script>

<style scoped>
.page {
  margin: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.75);
}
.page-canvas {
  background-color: white;
}
</style>
