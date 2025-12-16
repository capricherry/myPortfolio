<template>
  <div
    class="relative w-full overflow-hidden bg-gray-800 text-white"
    @mouseenter="pauseAutoplay"
    @mouseleave="maybeStartAutoplay"
  >
    <!-- Slides wrapper -->
    <div ref="track" class="track flex will-change-transform">
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
      @click="handlePrev"
      :disabled="isAnimating"
      :class="['hidden md:flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white focus:outline-none', isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black/60']"
      aria-label="Previous slide"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
    </button>

    <button
      @click="handleNext"
      :disabled="isAnimating"
      :class="['hidden md:flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white focus:outline-none', isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black/60']"
      aria-label="Next slide"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
    </button>

    <!-- Mobile tap areas -->
    <div class="md:hidden absolute left-0 top-0 h-full w-1/3" @click="handlePrev" aria-hidden="true"></div>
    <div class="md:hidden absolute right-0 top-0 h-full w-1/3" @click="handleNext" aria-hidden="true"></div>

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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

type Slide = { title?: string; subtitle?: string; image?: string | null; href?: string }

const props = defineProps<{
  slides: Slide[]
  autoplay?: boolean
  interval?: number
  loop?: boolean
}>()

const current = ref(0)
const timer = ref<number | null>(null)
const track = ref<HTMLElement | null>(null)
const isAnimating = ref(false)
let safetyTimer: number | null = null
let restartAutoplayTimer: number | null = null
let animateToken = 0
let manualClicks = 0
let manualClicksTimer: number | null = null
let suppressRestart = false
let suppressTimer: number | null = null

const slidesCount = computed(() => props.slides.length)
const perSlideDuration = 1000 // ms per slide; keeps consistent pace

function setTransition(ms = 1000) {
  if (!track.value) return
  track.value.style.transition = `transform ${ms}ms ease`
}

function clearTransition() {
  if (!track.value) return
  track.value.style.transition = 'none'
}

function setTransform(xPercent: number) {
  if (!track.value) return
  track.value.style.transform = `translateX(${xPercent}%)`
}

function animateSteps(count: number, dir: 'next' | 'prev'): Promise<void> {
  if (!track.value) return Promise.resolve()
  const n = Math.max(1, slidesCount.value)
  if (n === 1 && !props.loop) return Promise.resolve()
  count = ((count % n) + n) % n
  if (count === 0) return Promise.resolve()
  // clear any pending autoplay restarts while we manually animate
  if (restartAutoplayTimer) { clearTimeout(restartAutoplayTimer); restartAutoplayTimer = null }
  isAnimating.value = true
  const totalDuration = perSlideDuration * count

  return new Promise((resolve) => {
    // disable pointer events during animation to avoid overlapping inputs
    if (track.value) track.value.style.pointerEvents = 'none'
    const myToken = ++animateToken
    if (dir === 'next') {
      setTransition(totalDuration)
      // animate left by count * 100%
      requestAnimationFrame(() => setTransform(-100 * count))

      const onEnd = () => {
        if (myToken !== animateToken) return // stale
        // move first 'count' elements to the end in order
        if (!track.value) return finish()
        for (let i = 0; i < count; i++) {
          const first = track.value.children[0]
          if (first) track.value.appendChild(first)
        }
        clearTransition()
        setTransform(0)
        // force reflow
        track.value && track.value.offsetWidth
        current.value = (current.value + count) % n
        if (track.value) track.value.style.pointerEvents = 'auto'
        finish()
      }

      let handler: ((e: TransitionEvent) => void) | null = null

      const finishHandlerCleanup = () => {
        if (handler && track.value) { track.value.removeEventListener('transitionend', handler); handler = null }
        if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null }
      }

      handler = function (e: TransitionEvent) {
        if (e.propertyName === 'transform') {
          if (myToken !== animateToken) { finishHandlerCleanup(); return }
          finishHandlerCleanup()
          onEnd()
        }
      }
      track.value!.addEventListener('transitionend', handler)

      safetyTimer = window.setTimeout(() => {
        safetyTimer = null
        if (isAnimating.value) {
          finishHandlerCleanup()
          onEnd()
        }
      }, totalDuration + 200)
    } else {
      // prev: move last 'count' elements to front in original order
      const toMove: Element[] = []
      for (let i = 0; i < count; i++) {
        const last = track.value!.children[track.value!.children.length - 1]
        if (last) toMove.push(last)
      }
      // insert them in reverse so original order is preserved
      for (let i = toMove.length - 1; i >= 0; i--) {
        track.value!.insertBefore(toMove[i], track.value!.children[0])
      }

      clearTransition()
      // position shifted so the current slide is at translateX(-count*100%)
      setTransform(-100 * count)
      // force reflow then animate to 0
      track.value && track.value.offsetWidth
      setTransition(totalDuration)
      requestAnimationFrame(() => setTransform(0))

      const onEnd = () => {
        if (myToken !== animateToken) return
        clearTransition()
        current.value = (current.value - count + n) % n
        if (track.value) track.value.style.pointerEvents = 'auto'
        isAnimating.value = false
        resolve()
      }

      let handler: ((e: TransitionEvent) => void) | null = null

      const finishHandlerCleanup = () => {
        if (handler && track.value) { track.value.removeEventListener('transitionend', handler); handler = null }
        if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null }
      }

      handler = function (e: TransitionEvent) {
        if (e.propertyName === 'transform') {
          if (myToken !== animateToken) { finishHandlerCleanup(); return }
          finishHandlerCleanup()
          onEnd()
        }
      }
      track.value!.addEventListener('transitionend', handler)

      safetyTimer = window.setTimeout(() => {
        safetyTimer = null
        if (isAnimating.value) {
          finishHandlerCleanup()
          onEnd()
        }
      }, totalDuration + 200)
    }

    function finish() {
      isAnimating.value = false
      resolve()
    }
  })
}

function animateNext() { return animateSteps(1, 'next') }
function animatePrev() { return animateSteps(1, 'prev') }

function handleNext() {
  if (isAnimating.value) return
  if (!props.loop && current.value >= slidesCount.value - 1) return
  // user-initiated navigation should pause autoplay temporarily
  registerManualClick()
  pauseAutoplay()
  if (!suppressRestart) {
    if (restartAutoplayTimer) { clearTimeout(restartAutoplayTimer); restartAutoplayTimer = null }
    restartAutoplayTimer = window.setTimeout(() => { startAutoplay(); restartAutoplayTimer = null }, props.interval ?? 5000)
  }
  animateNext()
}

function handlePrev() {
  if (isAnimating.value) return
  if (!props.loop && current.value <= 0) return
  registerManualClick()
  pauseAutoplay()
  if (!suppressRestart) {
    if (restartAutoplayTimer) { clearTimeout(restartAutoplayTimer); restartAutoplayTimer = null }
    restartAutoplayTimer = window.setTimeout(() => { startAutoplay(); restartAutoplayTimer = null }, props.interval ?? 5000)
  }
  animatePrev()
}

async function goTo(i: number) {
  if (i === current.value) return
  if (isAnimating.value) return
  registerManualClick()
  const n = slidesCount.value
  // shortest direction: but requirement says direction depends only on button clicked; here we use steps in direction determined by target
  const diff = (i - current.value + n) % n
  // treat this as user interaction: pause autoplay and schedule restart
  pauseAutoplay()
  if (restartAutoplayTimer) { clearTimeout(restartAutoplayTimer); restartAutoplayTimer = null }
  if (!suppressRestart) restartAutoplayTimer = window.setTimeout(() => { startAutoplay(); restartAutoplayTimer = null }, props.interval ?? 5000)

  if (diff <= n / 2) {
    // move forward diff times (animate left) in one smooth transition
    await animateSteps(diff, 'next')
  } else {
    // move backward (n - diff) times (animate right)
    await animateSteps(n - diff, 'prev')
  }
}

function registerManualClick() {
  manualClicks++
  if (manualClicksTimer) { clearTimeout(manualClicksTimer); manualClicksTimer = null }
  manualClicksTimer = window.setTimeout(() => { manualClicks = 0; manualClicksTimer = null }, 2000)
  if (manualClicks >= 4) {
    // heavy manual navigation: suppress automatic restart for a cooldown period
    suppressRestart = true
    if (suppressTimer) { clearTimeout(suppressTimer); suppressTimer = null }
    suppressTimer = window.setTimeout(() => { suppressRestart = false; suppressTimer = null }, 30000)
    // also ensure autoplay is stopped
    stopAutoplay()
    if (restartAutoplayTimer) { clearTimeout(restartAutoplayTimer); restartAutoplayTimer = null }
  }
}

function startAutoplay() {
  stopAutoplay()
  if (suppressRestart) return
  if (!props.autoplay) return
  const ms = props.interval ?? 5000
  timer.value = window.setInterval(() => {
    if (!isAnimating.value) animateNext()
  }, ms)
}

function stopAutoplay() {
  if (timer.value != null) {
    clearInterval(timer.value)
    timer.value = null
  }
}

function pauseAutoplay() {
  stopAutoplay()
  if (restartAutoplayTimer) { clearTimeout(restartAutoplayTimer); restartAutoplayTimer = null }
}

function maybeStartAutoplay() {
  startAutoplay()
}

onMounted(() => {
  // initial transform setup
  nextTick(() => {
    clearTransition()
    setTransform(0)
  })
  startAutoplay()
})

onUnmounted(() => {
  stopAutoplay()
  if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null }
  if (restartAutoplayTimer) { clearTimeout(restartAutoplayTimer); restartAutoplayTimer = null }
  if (manualClicksTimer) { clearTimeout(manualClicksTimer); manualClicksTimer = null }
  if (suppressTimer) { clearTimeout(suppressTimer); suppressTimer = null }
})

watch(() => props.autoplay, (v) => {
  if (v) startAutoplay()
  else stopAutoplay()
})
</script>

<style scoped>
/* keep slide container height flexible; additional styles with Tailwind */
</style>
