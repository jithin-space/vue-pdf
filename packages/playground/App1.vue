<template>
  <div class="abs-stretch">
    <!-- Pass pdfDocument as a prop to the VuePDFViewer component -->
    <VuePDFViewer :pdf="pdf">
      <div>
        <h1>Loading....</h1>
      </div>
    </VuePDFViewer>
  </div>
</template>

<script lang="ts" setup>
import pdf14 from '@samples/large.pdf';
import { VuePDFViewer, usePDFViewer} from '@tato30/vue-pdf';


const { pdf } = usePDFViewer(pdf14);


</script>
<style lang="css" scoped>
.abs-stretch {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
}
</style>
