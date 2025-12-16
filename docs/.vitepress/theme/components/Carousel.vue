<template>
  <div
    class="relative w-full overflow-hidden bg-gray-800 text-white"
    @mouseenter="pauseAutoplay"
    @mouseleave="maybeStartAutoplay"
  >
    <!-- Slides wrapper -->
    <div class="flex transition-transform duration-500" :style="trackStyle">
      <div
        v-for="(s, i) in slides"
        :key="i"
        class="w-full flex-shrink-0 relative"
      >
        <component :is="s.href ? 'a' : 'div'" :href="s.href" class="block w-full h-64 sm:h-96">
          <img
            v-if="s.image"
            :src="s.image"
            alt="slide image"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-gray-700 flex items-center justify-center">
            <span class="text-gray-300">No image</span>
          </div>

          <!-- Overlay text -->
          <div class="absolute left-4 bottom-4 sm:left-8 sm:bottom-8 bg-black/40 backdrop-blur rounded-md p-3">
            <h3 v-if="s.title" class="text-lg font-semibold">{{ s.title }}</h3>
            <p v-if="s.subtitle" class="text-sm text-gray-200">{{ s.subtitle }}</p>
          </div>
        </component>
      </div>
    </div>

    <!-- Prev/Next arrows (desktop) -->
    <button
      @click="prev"
      class="hidden md:flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white hover:bg-black/60 focus:outline-none"
      aria-label="Previous slide"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
    </button>

    <button
      @click="next"
      class="hidden md:flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white hover:bg-black/60 focus:outline-none"
      aria-label="Next slide"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
    </button>

    <!-- Mobile tap areas -->
    <div class="md:hidden absolute left-0 top-0 h-full w-1/3" @click="prev" aria-hidden="true"></div>
    <div class="md:hidden absolute right-0 top-0 h-full w-1/3" @click="next" aria-hidden="true"></div>

    <!-- Dots -->
    <div class="absolute left-1/2 -translate-x-1/2 bottom-3 flex gap-2">
      <button
        v-for="(_, i) in slides"
        :key="i"
        @click="goTo(i)"
        :class="['w-3 h-3 rounded-full', current === i ? 'bg-white' : 'bg-white/50']"
        aria-label="Go to slide"
      ></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

type Slide = { title?: string; subtitle?: string; image?: string | null; href?: string }

const props = defineProps<{
  slides: Slide[]
  autoplay?: boolean
  interval?: number
  loop?: boolean
}>()

const current = ref(0)
const timer = ref<number | null>(null)

const trackStyle = computed(() => ({ transform: `translateX(-${current.value * 100}%)` }))

function next() {
  if (current.value < props.slides.length - 1) current.value++
  else if (props.loop) current.value = 0
}

function prev() {
  if (current.value > 0) current.value--
  else if (props.loop) current.value = props.slides.length - 1
}

function goTo(i: number) {
  current.value = i
}

function startAutoplay() {
  stopAutoplay()
  if (!props.autoplay) return
  const ms = props.interval ?? 5000
  timer.value = window.setInterval(() => next(), ms)
}

function stopAutoplay() {
  if (timer.value != null) {
    clearInterval(timer.value)
    timer.value = null
  }
}

function pauseAutoplay() {
  stopAutoplay()
}

function maybeStartAutoplay() {
  startAutoplay()
}

onMounted(() => {
  startAutoplay()
})

onUnmounted(() => {
  stopAutoplay()
})

watch(() => props.autoplay, (v) => {
  if (v) startAutoplay()
  else stopAutoplay()
})
</script>

<style scoped>
/* keep slide container height flexible; additional styles with Tailwind */
</style>
