<template>
    <sl-button
      variant="text"
      size="medium"
      circle
      @click="$emit('prev')"
      :disabled="isPrevDisabled"
    >
      <sl-icon name="chevron-left" label="Prev"></sl-icon>
    </sl-button>

    <sl-input
      size="small"
      style="width: 3rem"
      :value="inputPage"
      @sl-change="onChange"
      placeholder="Enter page number"
    />
    <span>/</span>
    <span class="paginator-total">{{ totalPages }}</span>
    <sl-button
      variant="text"
      size="medium"
      circle
      @click="$emit('next')"
      :disabled="isNextDisabled"
    >
      <sl-icon name="chevron-right" label="Next"></sl-icon>
    </sl-button>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import "@shoelace-style/shoelace/dist/components/button/button";
import "@shoelace-style/shoelace/dist/components/input/input";

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
});

// Emit events
const emit = defineEmits(["prev", "next", "change-page"]);

// State and computed properties
const inputPage = ref(props.currentPage + 1);

watch(
  () => props.currentPage,
  (newPage) => {
    inputPage.value = newPage + 1;
  }
);

const isPrevDisabled = computed(() => props.currentPage <= 0);
const isNextDisabled = computed(
  () => props.currentPage >= props.totalPages - 1
);

function onChange(event: Event) {
  inputPage.value = event.target.value;
  const pageNumber = Math.max(
    0,
    Math.min(inputPage.value - 1, props.totalPages - 1)
  );
  if (props.currentPage !== pageNumber) {
    inputPage.value = pageNumber + 1;
    emit("change-page", pageNumber);
  }
}
</script>

<style scoped>
/* Add specific styles if needed */
</style>
