<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'

import DocsConsoleCta from './components/DocsConsoleCta.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <DocsConsoleCta placement="desktop" />
    </template>
    <template #nav-screen-content-after>
      <DocsConsoleCta placement="mobile" />
    </template>
  </Layout>
</template>
