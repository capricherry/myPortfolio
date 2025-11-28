---
title: Vite
titleTemplate: Next Generation Frontend Tooling
# add `dark` here to apply dark mode on initial load,
# since `onMounted` doesn't run during SSR
pageClass: landing dark

layout: home
aside: false
editLink: false
markdownStyles: false

---

<script setup>
import { useData } from 'vitepress'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import Hero from './.vitepress/theme/1. hero-section/HeroSection.vue'

import FrameworksSection from './.vitepress/theme/3. frameworks-section/FrameworksSection.vue'

const { isDark } = useData()

onMounted(() => {
  document.documentElement.classList.add('dark')
})

onBeforeUnmount(() => {
  document.documentElement.classList.toggle('dark', isDark.value)
})
</script>
<div class="VPHome">
  <Hero/>
  <FrameworksSection />
</div>
