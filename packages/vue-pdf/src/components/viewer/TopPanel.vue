<template>
  <div class="viewer-panel-top">
    <h1>top panel</h1>
  </div>
</template>
<script lang="ts" setup></script>
<style lang="css" scoped>
.viewer-panel-top {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  width: 100%;
  height: 40px;
  background: dimgray;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.75);
  z-index: 1;
  transition: height 0.25s ease-out 0.1s;
}
.panels-hidden .ts-pdf-viewer-panel-top {
  height: 0;
  transition: height 0.25s ease-in 0.1s;
}
</style>
