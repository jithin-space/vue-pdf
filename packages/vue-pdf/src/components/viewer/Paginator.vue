<template>
    <div class="paginator">
      <button @click="$emit('prev')" :disabled="isPrevDisabled">prev</button>
      <button @click="$emit('next')" :disabled="isNextDisabled">next</button>
      <input
        type="number"
        v-model="inputPage"
        @change="onChange"
        placeholder="Enter page number"
      />
      <span>/</span>
      <span class="paginator-total">{{ totalPages }}</span>
    </div>
  </template>
  
  <script lang="ts" setup>
  import { ref, computed, watch } from "vue";
  
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
  const isNextDisabled = computed(() => props.currentPage >= props.totalPages - 1);
  
  function onChange() {
    const pageNumber = Math.max(0, Math.min(inputPage.value - 1, props.totalPages - 1));
    if (props.currentPage !== pageNumber) {
      inputPage.value = pageNumber + 1;
      emit("change-page", pageNumber);
    }
  }
  </script>
  
  <style scoped>
  /* Add specific styles if needed */
  </style>
  