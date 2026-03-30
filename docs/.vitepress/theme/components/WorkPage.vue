<script setup lang="ts">
import { withBase, useRouter } from 'vitepress'
import { ref, computed, onMounted } from 'vue'

type Card = {
  slug: string
  title: string
  name: string
  excerpt: string
  route: string   // `/works/?id=slug`
  image: string | null
  component: any
  allImages: string[]  // all images for this work
  bg?: string
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

// Handle scroll color transitions
let animationFrameId: number | null = null
const handleScrollColorTransition = () => {
  const backgroundLayer = document.getElementById('background-transition') as HTMLElement
  const projectSections = Array.from(document.querySelectorAll('.project-section')) as HTMLElement[]
  const windowHeight = window.innerHeight
  
  if (!backgroundLayer || projectSections.length === 0) return
  
  const transitionRange = windowHeight * 6 // Transition happens over 6 viewports for Apple-like luxury feel
  let currentBgColor = colorMap[projectSections[0]?.dataset.slug || ''] || '#816C5B'
  
  // Find which section(s) we should be showing
  for (let index = 0; index < projectSections.length; index++) {
    const section = projectSections[index]
    const rect = section.getBoundingClientRect()
    const elementTop = rect.top
    const elementBottom = rect.bottom
    const slug = section.dataset.slug || ''
    
    // This section is transitioning out (scrolling upward past viewport)
    if (elementTop < 0 && elementBottom > 0 && index < projectSections.length - 1) {
      // We're in the middle of a transition - blend to next color
      const nextSlug = projectSections[index + 1].dataset.slug || ''
      const color1 = colorMap[slug] || '#000000'
      const color2 = colorMap[nextSlug] || '#000000'
      
      const distancePastTop = Math.abs(elementTop)
      const progress = Math.min(1, distancePastTop / transitionRange)
      
      currentBgColor = interpolateColor(color1, color2, progress)
      break
    }
    // This section is visible (above top of viewport but not past)
    else if (elementTop <= 0 && elementBottom > 0) {
      // Section is on screen - show this section's color
      currentBgColor = colorMap[slug] || '#000000'
      break
    }
    // This section is entering from below
    else if (elementTop > 0 && elementTop < windowHeight) {
      currentBgColor = colorMap[slug] || '#000000'
      break
    }
  }
  
  // Apply the unified background color
  backgroundLayer.style.backgroundColor = currentBgColor
  
  // Now handle content visibility for each section
  projectSections.forEach((section, index) => {
    const rect = section.getBoundingClientRect()
    const elementTop = rect.top
    const elementBottom = rect.bottom
    const content = section.querySelector('.project-content') as HTMLElement
    
    if (!content) return
    
    let contentOpacity = 0
    
    // Check if the PREVIOUS section is transitioning to this one
    let isBeingTransitionedInto = false
    if (index > 0) {
      const prevSection = projectSections[index - 1]
      const prevRect = prevSection.getBoundingClientRect()
      const prevElementTop = prevRect.top
      const prevElementBottom = prevRect.bottom
      
      // Previous section is transitioning (scrolling up)
      if (prevElementTop < 0 && prevElementBottom > 0) {
        isBeingTransitionedInto = true
        
        const distancePastTop = Math.abs(prevElementTop)
        const progress = Math.min(1, distancePastTop / transitionRange)
        
        // Fade in over 0.65 to 1.0 range (35% of transition) - longer, smoother fade
        if (progress >= 0.65) {
          const fadeInProgress = (progress - 0.65) / 0.35
          contentOpacity = fadeInProgress
        } else {
          contentOpacity = 0
        }
      }
    }
    
    // Only apply normal visibility if not being transitioned into
    if (!isBeingTransitionedInto) {
      // Section is transitioning out (scrolling upward)
      if (elementTop < 0 && elementBottom > 0 && index < projectSections.length - 1) {
        const distancePastTop = Math.abs(elementTop)
        const progress = Math.min(1, distancePastTop / transitionRange)
        
        // Fade out current section content as we scroll (0 to 0.65) - longer fade for smoothness
        if (progress < 0.65) {
          contentOpacity = Math.max(0, 1 - (progress / 0.65))
        } else {
          contentOpacity = 0
        }
      }
      // Section is fully visible on screen
      else if (elementTop <= 0 && elementBottom > 0) {
        contentOpacity = 1
      }
      // Section is entering from below
      else if (elementTop > 0 && elementTop < windowHeight) {
        contentOpacity = 1
      }
      // Section is out of view
      else {
        contentOpacity = 0
      }
    }
    
    content.style.opacity = Math.max(0, contentOpacity).toString()
    content.style.pointerEvents = contentOpacity > 0.5 ? 'auto' : 'none'
  })
}

// Throttle scroll handler with requestAnimationFrame
const throttledScroll = () => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
  animationFrameId = requestAnimationFrame(() => {
    handleScrollColorTransition()
    animationFrameId = null
  })
}

// 1) Markdown as Vue components
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

// (palette removed) per-work backgrounds are defined in CSS by slug

for (const path in markdownFiles) {
  const raw = markdownFiles[path] as string
  const lines = raw.split('\n')

  const titleLine = lines.find(line => line.startsWith('# '))
  const nameLine = lines.find(line => line.startsWith('## '))
  const excerptLine = lines.find(line => line.trim() && !line.startsWith('#'))

  // parse optional YAML frontmatter (e.g. ---\nbg: "#0b1220"\n---)
  let bg: string | undefined = undefined
  const fmMatch = raw.match(/^---\s*([\s\S]*?)\s*---/)
  if (fmMatch) {
    const fm = fmMatch[1]
    const bgLine = fm.split('\n').find(l => l.trim().startsWith('bg:'))
    if (bgLine) {
      bg = bgLine.replace(/^bg:\s*/, '').trim().replace(/^['\"]|['\"]$/g, '')
    }
  }

  // e.g. docs/works/my-work/index.md -> slug = "my-work"
  const match = path.match(/works\/([^/]+)\/index\.md$/)
  const slug = match?.[1] ?? ''

  // We stay on /works and switch via ?id=slug
  const route = `/works/?id=${slug}`

  const folder = path.replace(/\/index\.md$/, '/')
  const imageKey = Object.keys(imageFiles).find(k => k.startsWith(folder))

  // Get all images for this work
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
    allImages: workImages,
    bg
  })
}

// Add scroll listener on mount
onMounted(() => {
  window.addEventListener('scroll', throttledScroll, { passive: true })
  // Initial call to set colors on first load
  handleScrollColorTransition()
  
  return () => {
    window.removeEventListener('scroll', throttledScroll)
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
    }
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
        :style="{ width: '100vw', marginLeft: 'calc(50% - 50vw)', backgroundColor: 'transparent' }"
      >
        <!-- centered content container (reduced horizontal padding ~10%) -->
        <div class="min-h-screen mx-auto w-full max-w-6xl px-0 py-12 border-b border-gray-800 last:border-b-0 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-end text-white project-content">
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
        <div v-if="card.allImages.length >= 1 || card.image" :class="['flex gap-6 h-64 items-center', card.slug === 'HeartOfGlass' ? 'w-3/4' : 'ml-0 mr-auto']">
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
      <div v-if="card.image || (card.slug === 'DefensiveMode' && card.allImages[0])" :class="['flex items-start', card.slug === 'HeartOfGlass' ? 'md:order-1 justify-start' : 'md:order-2 justify-end']">
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
</template>
