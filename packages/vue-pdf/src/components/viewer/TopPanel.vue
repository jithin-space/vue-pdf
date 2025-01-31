<template>
  <div class="viewer-panel-top-wrapper">
    <!-- Paginator Component -->
    <div class="viewer-panel-top-container">
      <div class="toolbar-start">
        <sl-button
          @click="togglePreview"
          :variant="showPreview ? 'default' : 'text'"
          size="medium"
          :circle="showPreview"
        >
          <sl-icon name="window-sidebar"></sl-icon>
        </sl-button>
        <Paginator
          :currentPage="currentPage"
          :totalPages="totalPages"
          @prev="onPaginatorPrev"
          @next="onPaginatorNext"
          @change-page="onChangePage"
        />
      </div>
      <!-- ZoomControls Component -->
      <div class="toolbar-middle">
        <ZoomControls
          @zoom-out="onZoomOut"
          @zoom-in="onZoomIn"
          @fit-viewer="onZoomFitViewer"
          @fit-page="onZoomFitPage"
          @set-zoom="onSetZoom"
          :scale="scale"
        />
      </div>
      <div class="panel-separator"></div>
    </div>
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
  onSetZoom: {
    type: Function,
    required: true,
  },
  scale: {
    type: Number,
    required: true,
  },
  showPreview: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(["togglePreview"]);

const togglePreview = () => {
  emit("togglePreview");
};

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
.viewer-panel-top-wrapper {
  display: flex;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  border-top-left-radius: 0.75rem;
  border-top-right-radius: 0.75rem;
  border-bottom-width: 1px;
  height: 40px;
  display: flex;
  align-items: center;
  background-color: var(--sl-color-neutral-200);
  padding-top: 2px;
  z-index: 5;
}
.viewer-panel-top-container {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.viewer-panel-top-container .toolbar-middle {
  justify-content: center;
}

.viewer-panel-top-container div {
  display: flex;
  gap: 2px;
  align-items: center;
  justify-items: space-between;
  width: 100%;
}
</style>
