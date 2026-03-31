<script setup lang="ts">
import { withBase, useRouter } from 'vitepress'
import { ref, computed, onMounted } from 'vue'

type Card = {
  slug: string
  title: string
  name: string
  excerpt: string
  route: string
  image: string | null
  component: any
  allImages: string[]
}

// Color map for each section
const colorMap: Record<string, string> = {
  DefensiveMode: '#816C5B',
  HeartOfGlass: '#161515',
  UpskirtQR: '#292929'
}

// Helper to convert hex to RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
}

// Helper to interpolate between two colors
const interpolateColor = (color1: string, color2: string, factor: number) => {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor)
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor)
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor)
  
  return `rgb(${r}, ${g}, ${b})`
}

let lastScrollY = 0

// Easing functions for smooth professional animations
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)
const easeInQuart = (t: number) => t * t * t * t

// Handle scroll color transitions
const handleScrollColorTransition = () => {
  const backgroundLayer = document.getElementById('background-transition') as HTMLElement
  const projectSections = Array.from(document.querySelectorAll('.project-section')) as HTMLElement[]
  const windowHeight = window.innerHeight
  
  if (!backgroundLayer || projectSections.length === 0) return
  
  // Current scroll position (use top of viewport for color transition start)
  const scrollPos = window.scrollY
  const currentScrollDirection = scrollPos > lastScrollY ? 1 : -1 // 1 = down, -1 = up
  lastScrollY = scrollPos
  
  let currentBgColor = colorMap[projectSections[0]?.dataset.slug || ''] || '#816C5B'
  
  // Find which section we're in and transition to next
  for (let i = 0; i < projectSections.length; i++) {
    const section = projectSections[i]
    const sectionTop = section.offsetTop
    const sectionHeight = section.offsetHeight
    const sectionBottom = sectionTop + sectionHeight
    
    // Check if scroll position is within or past this section
    if (scrollPos < sectionBottom) {
      const currentSlug = section.dataset.slug || ''
      const color1 = colorMap[currentSlug] || '#000000'
      
      // If we're in the transition/gap area and there's a next section, interpolate
      if (i < projectSections.length - 1) {
        const nextSection = projectSections[i + 1]
        const nextSlug = nextSection.dataset.slug || ''
        const color2 = colorMap[nextSlug] || '#000000'
        
        // Calculate progress through this section (including the gap)
        const progress = (scrollPos - sectionTop) / sectionHeight
        
        if (progress >= 0 && progress <= 1) {
          currentBgColor = interpolateColor(color1, color2, progress)
        } else if (progress > 1) {
          currentBgColor = color2
        } else {
          currentBgColor = color1
        }
      } else {
        // Last section - stay on its color
        currentBgColor = color1
      }
      break
    }
  }
  
  // Ensure we never go past the last section's color
  if (scrollPos >= projectSections[projectSections.length - 1].offsetTop + projectSections[projectSections.length - 1].offsetHeight) {
    const lastSlug = projectSections[projectSections.length - 1].dataset.slug || ''
    currentBgColor = colorMap[lastSlug] || '#000000'
  }
  
  backgroundLayer.style.backgroundColor = currentBgColor
  
  // Handle content visibility - fade based on snap point position
  projectSections.forEach((section, index) => {
    const snapContent = section.querySelector('.snap-content') as HTMLElement
    const content = section.querySelector('.project-content') as HTMLElement
    
    if (!content || !snapContent) return
    
    const snapRect = snapContent.getBoundingClientRect()
    const snapHeight = snapRect.height
    const snapCenter = snapRect.top + snapHeight / 2
    const viewportCenter = windowHeight / 2
    
    // Calculate how far from center (0 = perfectly centered)
    const absDistance = Math.abs(snapCenter - viewportCenter)
    const isLastSection = index === projectSections.length - 1
    
    // Asymmetric fade: starts fading in at 16vh, fades out over 24vh
    const fadeInDistance = windowHeight * 0.16
    const fadeOutDistance = windowHeight * 0.24
    
    let contentOpacity: number
    
    if (absDistance <= fadeInDistance) {
      // Fade-in zone: ultra-aggressive curve to reach full opacity almost immediately
      const normalizedDistance = absDistance / fadeInDistance
      contentOpacity = Math.pow(1 - normalizedDistance, 0.25)
    } else if (absDistance <= fadeOutDistance) {
      // Fade-out zone: smooth gentle curve
      const normalizedDistance = (absDistance - fadeInDistance) / (fadeOutDistance - fadeInDistance)
      contentOpacity = easeInQuart(1 - normalizedDistance)
    } else {
      // Beyond fade-out distance: fully transparent except last section
      contentOpacity = isLastSection && (snapCenter - viewportCenter) > 0 ? 1 : 0
    }
    
    content.style.opacity = Math.max(0, contentOpacity).toString()
    content.style.pointerEvents = contentOpacity > 0.5 ? 'auto' : 'none'
  })
}

// Markdown as Vue components
const markdownModules = import.meta.glob('../../../works/**/index.md', {
  eager: true
})

// 2) Raw markdown text for meta (title, name, excerpt)
const markdownFiles = import.meta.glob('../../../works/**/index.md', {
  as: 'raw',
  eager: true
})

// Cover images for cards
const imageFiles = import.meta.glob('../../../works/**/cover.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default'
})

// All images for detail pages
const allImageFiles = import.meta.glob('../../../works/**/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default'
})

const cards = ref<Card[]>([])

for (const path in markdownFiles) {
  const raw = markdownFiles[path] as string
  const lines = raw.split('\n')

  const titleLine = lines.find(line => line.startsWith('# '))
  const nameLine = lines.find(line => line.startsWith('## '))
  const excerptLine = lines.find(line => line.trim() && !line.startsWith('#'))

  const match = path.match(/works\/([^/]+)\/index\.md$/)
  const slug = match?.[1] ?? ''
  const route = `/works/?id=${slug}`

  const folder = path.replace(/\/index\.md$/, '/')
  const imageKey = Object.keys(imageFiles).find(k => k.startsWith(folder))

  const workImages = Object.keys(allImageFiles)
    .filter(k => k.startsWith(folder))
    .map(k => allImageFiles[k] as string)

  const mod = markdownModules[path] as any

  cards.value.push({
    slug,
    title: titleLine?.replace(/^# /, '') || 'Untitled',
    name: nameLine?.replace(/^## /, '') || 'Anonymous',
    excerpt: excerptLine || '',
    route,
    image: imageKey ? (imageFiles[imageKey] as string) : null,
    component: mod?.default || null,
    allImages: workImages
  })
}

// Add scroll listener on mount
onMounted(() => {
  window.addEventListener('scroll', handleScrollColorTransition, { passive: true })
  handleScrollColorTransition()
  
  return () => {
    window.removeEventListener('scroll', handleScrollColorTransition)
  }
})


</script>

<template>
  <div class="bg-black text-white relative" style="position: relative; z-index: 0;">
    <!-- Single unified background layer that transitions color -->
    <div 
      id="background-transition"
      class="fixed top-0 left-0 w-full h-screen pointer-events-none"
      style="will-change: background-color; z-index: -1; background-color: #816C5B;"
    />
    
    <!-- Stack all works vertically -->
    <div v-for="(card, i) in cards" :key="card.slug">
      <!-- full-bleed background wrapper (transparent - background handled by background layer) -->
      <div
        class="project-section py-0"
        :data-slug="card.slug"
        :style="{ width: '100vw', marginLeft: 'calc(50% - 50vw)', backgroundColor: 'transparent', marginBottom: i === cards.length - 1 ? '0vh' : '180vh' }"
      >
        <!-- centered content container -->
        <div class="min-h-screen mx-auto w-full max-w-6xl px-0 py-12 border-b border-gray-800 last:border-b-0 flex flex-col justify-center text-white">
          <!-- snap target: wraps just the content without padding -->
          <div class="snap-content project-content grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-end">
      <!-- LEFT COLUMN: Text Content -->
      <div :class="['flex flex-col justify-between h-full', card.slug === 'HeartOfGlass' ? 'md:order-2' : 'md:order-1']" :style="card.slug === 'HeartOfGlass' ? { color: '#b62f23' } : card.slug === 'DefensiveMode' ? { color: '#6B1C1C' } : {}">
        <!-- Top section: Title and content -->
        <div class="flex flex-col justify-start">
          <!-- Work Title and Author -->
          <div class="mb-8">
            <h2 class="text-5xl md:text-6xl font-bold mb-3">
              {{ card.title }}
            </h2>
            <h3 :class="['text-lg md:text-xl font-medium', card.name === 'Anonymous' ? 'text-yellow-400 bg-yellow-900 px-2 py-1 rounded' : card.slug === 'HeartOfGlass' ? 'text-[#b62f23]' : card.slug === 'DefensiveMode' ? 'text-[#6B1C1C]' : 'text-gray-400']">
              {{ card.name }}
            </h3>
          </div>

          <!-- Markdown Content (hide top-level headings to avoid duplicate title) -->
          <div class="work-content mb-12" :style="card.slug === 'HeartOfGlass' ? { color: '#b62f23' } : card.slug === 'DefensiveMode' ? { color: '#6B1C1C' } : {}">
            <component
              v-if="card.component"
              :is="card.component"
              :class="['prose prose-base md:prose-lg max-w-none prose-p:text-gray-300', card.slug === 'HeartOfGlass' ? 'prose-headings:!text-[#b62f23]' : 'prose-invert prose-headings:text-white']"
            />
          </div>
        </div>

        <!-- Bottom section: Smaller images -->
        <div v-if="card.allImages.length >= 1 || card.image" :class="['flex gap-6 h-64 items-end', card.slug === 'HeartOfGlass' ? 'w-3/4' : 'ml-0 mr-auto']">
          <template v-if="card.slug === 'HeartOfGlass'">
            <img
              :src="card.allImages.find(img => img.includes('closeup'))"
              alt="closeup"
              class="h-full w-auto object-contain bg-black"
            />
            <img
              :src="card.allImages.find(img => img.includes('globe'))"
              alt="globe"
              class="h-full w-auto object-contain bg-black"
            />
          </template>
          <template v-else-if="card.slug === 'DefensiveMode'">
            <img
              :src="card.image"
              :alt="`${card.title} cover`"
              class="h-full w-auto object-contain bg-black"
            />
          </template>
          <template v-else-if="card.slug === 'UpskirtQR'">
            <img
              :src="card.allImages[1]"
              :alt="`${card.title} image 1`"
              class="h-full w-auto object-contain bg-black"
            />
            <img
              :src="card.allImages[2]"
              :alt="`${card.title} image 2`"
              class="h-full w-auto object-contain bg-black"
              :style="{ transform: 'scaleY(-1)' }"
            />
          </template>
          <template v-else>
            <img
              :src="card.allImages[0]"
              :alt="`${card.title} image 1`"
              class="h-full w-auto object-contain bg-black"
            />
          </template>
        </div>
      </div>

      <!-- RIGHT COLUMN: Large Hero Image -->
      <div v-if="card.image || (card.slug === 'DefensiveMode' && card.allImages[0])" :class="['flex items-end', card.slug === 'HeartOfGlass' ? 'md:order-1 justify-start' : 'md:order-2 justify-end']">
        <img
          :src="card.slug === 'DefensiveMode' ? card.allImages[0] : card.image"
          alt="cover image"
          :style="{ width: card.slug === 'DefensiveMode' ? '50%' : '75%' }"
          class="h-auto object-cover"
        />
      </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
