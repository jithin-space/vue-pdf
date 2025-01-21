<template>
  <div class="viewer-panel-bottom">
    <!-- Paginator Component -->
    <Paginator
      :currentPage="currentPage"
      :totalPages="totalPages"
      @prev="onPaginatorPrev"
      @next="onPaginatorNext"
      @change-page="onChangePage"
    />
    <div class="panel-separator"></div>
    <!-- ZoomControls Component -->
    <ZoomControls
      @zoom-out="onZoomOut"
      @zoom-in="onZoomIn"
      @fit-viewer="onZoomFitViewer"
      @fit-page="onZoomFitPage"
    />
  </div>
</template>

<script lang="ts" setup>
import Paginator from "./Paginator.vue";
import ZoomControls from "./ZoomControls.vue";

// Props definition
const props = defineProps({
  totalPages: {
    type: Number,
    required: true,
  },
  currentPage: {
    type: Number,
    required: true,
  },
  scrollToPage: {
    type: Function,
    required: true,
  },
  onZoomOut: {
    type: Function,
    required: true,
  },
  onZoomIn: {
    type: Function,
    required: true,
  },
  onZoomFitPage: {
    type: Function,
    required: true,
  },
  onZoomFitViewer: {
    type: Function,
    required: true,
  },
});

// Methods
function onPaginatorPrev() {
  const prevPage = Math.max(0, props.currentPage - 1);
  props.scrollToPage(prevPage);
}

function onPaginatorNext() {
  const nextPage = Math.min(props.totalPages - 1, props.currentPage + 1);
  props.scrollToPage(nextPage);
}

function onChangePage(pageNumber: number) {
  props.scrollToPage(pageNumber);
}
</script>

<style scoped>
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
</style>
