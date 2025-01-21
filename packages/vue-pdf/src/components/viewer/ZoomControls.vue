<template>
    <div id="zoomer" class="subpanel">
      <button @click="$emit('zoom-out')">zoom out</button>
      <button @click="$emit('zoom-in')">zoom in</button>
      <button @click="$emit('fit-viewer')">fit viewer</button>
      <button @click="$emit('fit-page')">fit page</button>
    </div>
  </template>
  
  <script lang="ts" setup>
  
  // Emit events
  defineEmits(["zoom-out", "zoom-in", "fit-viewer", "fit-page"]);
  </script>
  
  <style scoped>
  /* Add specific styles if needed */
  </style>
  