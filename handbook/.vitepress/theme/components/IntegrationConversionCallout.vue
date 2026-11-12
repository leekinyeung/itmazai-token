<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const english = computed(() => lang.value.startsWith('en'))
const title = computed(() =>
  english.value ? 'Need a Taodock API key?' : '还没有 API Key？'
)
const description = computed(() =>
  english.value
    ? 'Create a dedicated API key in the Taodock console, then return to finish this client setup.'
    : '前往 Taodock 控制台创建专用 API Key，再返回本教程完成客户端配置。'
)
const label = computed(() =>
  english.value ? 'Get API Key (Console)' : '获取 API Key（控制台）'
)
</script>

<template>
  <aside
    class="taodock-conversion-callout"
    data-taodock-conversion-callout
    :aria-label="title"
  >
    <div>
      <strong>{{ title }}</strong>
      <p>{{ description }}</p>
    </div>
    <a
      href="https://taodock.com/keys"
      target="_blank"
      rel="noopener noreferrer"
      data-taodock-conversion-link
    >
      {{ label }}
    </a>
  </aside>
</template>
