<template>
  <div ref="container" class="page-text"></div>
</template>

<script lang="ts" setup>
import { ref, toRaw, watch } from "vue";
import {
  RenderingCancelledException,
  PDFPageProxy,
  TextLayer,
} from "pdfjs-dist";

// Props
const props = defineProps<{
  pageProxy?: PDFPageProxy;
  scale: number;
  rendered: boolean;
}>();

// Refs
const container = ref<HTMLDivElement | null>(null);

// Local variables
const renderTask = ref<TextLayer | null>(null);

// Methods
const renderTextLayerAsync = async () => {
  if (!container.value || !props.pageProxy) return;

  // Clear previous content
  container.value.innerHTML = "";

  if (renderTask.value) {
    renderTask.value = null;
  }

  // Get the viewport for the current page
  const viewport = props.pageProxy.getViewport({ scale: props.scale });

  // Get the text content from the page
  const textContentSource = await props.pageProxy.getTextContent();

  container.value.style.setProperty("--scale-factor", props.scale + "");

  // Initialize the TextLayerBuilder for rendering the text layer
  renderTask.value = new TextLayer({
    textContentSource,
    container: container.value,
    viewport,
  });

  try {
    await toRaw(renderTask.value).render();
  } catch (error) {
    if (error instanceof RenderingCancelledException) {
      return;
    } else {
      throw error;
    }
  }
};

watch(
  () => [props.pageProxy, props.scale, props.rendered],
  ([newPageProxy, newScale, newRendered]) => {
    if (!newPageProxy) return;
    if (newRendered) {
      renderTextLayerAsync();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.page-text {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  line-height: 1;
}
</style>
