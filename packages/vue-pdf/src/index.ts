import type { Plugin } from 'vue'
import VuePDF from './components/VuePDF.vue'
import '@shoelace-style/shoelace/dist/themes/light.css';
import './global-styles.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path';
setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.19.1/cdn/'); //TODO: need to check how to incorporate in the lib



export const VuePDFPlugin: Plugin = {
  install(Vue) {
    Vue.component(VuePDF.name, VuePDF)
  },
}

export * from './components'
export default VuePDFPlugin
