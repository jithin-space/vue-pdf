<template>
    <sl-button variant="text" size="medium" circle @click="$emit('zoom-out')" :disabled="props.scale == 0.25">
      <sl-icon name="zoom-out" label="Zoom Out"></sl-icon>
    </sl-button>
    <sl-dropdown>
      <!-- Button to trigger dropdown -->
      <sl-button slot="trigger" caret>{{ selectedZoom }}</sl-button>
      <!-- Menu options -->
      <sl-menu @sl-select="handleSelect">
        <sl-menu-item value="0.5">50%</sl-menu-item>
        <sl-menu-item value="0.75">75%</sl-menu-item>
        <sl-menu-item value="1">100%</sl-menu-item>
        <sl-menu-item value="1.25">125%</sl-menu-item>
        <sl-menu-item value="1.5">150%</sl-menu-item>
        <sl-menu-item value="2">200%</sl-menu-item>
        <sl-menu-item value="3">300%</sl-menu-item>
        <sl-menu-item value="4">400%</sl-menu-item>
        <sl-menu-item value="fit-page">Fit Page</sl-menu-item>
        <sl-menu-item value="fit-viewer">Fit Viewer</sl-menu-item>
      </sl-menu>
    </sl-dropdown>
    <sl-button variant="text" size="medium" circle @click="$emit('zoom-in')" :disabled="props.scale == 4">
      <sl-icon name="zoom-in" label="Next"></sl-icon>
    </sl-button>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import "@shoelace-style/shoelace/dist/components/button/button";
import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/menu/menu.js";
import "@shoelace-style/shoelace/dist/components/menu-item/menu-item.js";
// Emit events
const emit = defineEmits([
  "zoom-out",
  "zoom-in",
  "fit-viewer",
  "fit-page",
  "set-zoom",
]);

const props = defineProps({
  scale: {
    type: Number,
    required: true,
  },
});
const selectedZoom = computed(() => {
  return `${Math.round(props.scale * 100)}%`;
});

function handleSelect(event: Event) {
  selectedZoom.value = event.detail.item.value;
  switch (event.detail.item.value) {
    case "fit-page":
      emit("fit-page");
      break;
    case "fit-viewer":
      emit("fit-viewer");
      break;
    default:
      emit("set-zoom", event.detail.item.value);
  }
}
</script>

<style scoped>
/* Add specific styles if needed */
</style>
