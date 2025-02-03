<template>
  <div
    ref="previewPanel"
    class="preview-panel"
    :class="{ collapsed: !showPreview }"
  >
    <div
      v-for="pageNumber in totalPages"
      :key="pageNumber"
      class="preview-thumbnail"
      :class="{ active: pageNumber === currentPage + 1 }"
      @click="scrollToPage(pageNumber - 1)"
      ref="thumbnailRefs"
    >
      <PageCanvas
        :pageNumber="pageNumber"
        :pdfDocument="pdfDocument"
        :isThumbnail="true"
      />
      <span>{{ pageNumber }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import PageCanvas from "./Page.vue";

const props = defineProps<{
  showPreview: boolean;
  totalPages: number;
  currentPage: number;
  scrollToPage: (pageNumber: number) => void;
  pdfDocument: any;
}>();

const previewPanel = ref<HTMLElement | null>(null);
const thumbnailRefs = ref<(HTMLElement | null)[]>([]);

watch(
  () => props.currentPage,
  async (newPage) => {
    await nextTick(); // Wait for DOM updates
    scrollActiveThumbnailIntoView(newPage);
  }
);

function scrollActiveThumbnailIntoView(pageNumber: number) {
  if (!previewPanel.value || !thumbnailRefs.value[pageNumber]) return;

  const activeThumbnail = thumbnailRefs.value[pageNumber];
  const panelRect = previewPanel.value.getBoundingClientRect();
  const thumbnailRect = activeThumbnail.getBoundingClientRect();

  if (
    thumbnailRect.top < panelRect.top ||
    thumbnailRect.bottom > panelRect.bottom
  ) {
    previewPanel.value.scrollTop +=
      thumbnailRect.top -
      panelRect.top -
      panelRect.height / 2 +
      thumbnailRect.height / 2;
  }
}
</script>

<style scoped>
.preview-panel {
  width: 140px;
  position: absolute;
  left: 0;
  top: 40px;
  bottom: 0;
  background: #fff;
  overflow-y: auto; /* Enable scrolling */
  padding: 10px;
  border-right: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease-in-out;
}

.collapsed {
  /* display: none; */
  width: 0; /* Hide sidebar */
  padding: 0;
  border: none;
  overflow: hidden;
}

.preview-thumbnail {
  width: 100px;
  height: auto;
  cursor: pointer;
  margin: 0 auto;
  margin-bottom: 8px;
  border-width: 10px 10px 20px 10px;
  padding: 14px;
  padding-bottom: 0px;
  text-align: center;
}

.preview-thumbnail.active {
  border-color: blue;
  background-color: lightblue;
}
</style>
