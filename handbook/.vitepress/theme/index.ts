import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'

import Layout from './Layout.vue'
import IntegrationConversionCallout from './components/IntegrationConversionCallout.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('IntegrationConversionCallout', IntegrationConversionCallout)
  },
} satisfies Theme
