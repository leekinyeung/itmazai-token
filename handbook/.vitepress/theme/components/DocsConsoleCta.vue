<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{
  placement: 'desktop' | 'mobile'
}>()
const { lang } = useData()
const label = computed(() =>
  lang.value.startsWith('en')
    ? 'Get API Key (Console)'
    : '获取 API Key（控制台）'
)
</script>

<template>
  <a
    :class="[
      'taodock-console-cta',
      `taodock-console-cta--${props.placement}`,
    ]"
    href="https://taodock.com/keys"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="label"
    :data-taodock-console-cta="props.placement"
  >
    {{ label }}
  </a>
</template>
