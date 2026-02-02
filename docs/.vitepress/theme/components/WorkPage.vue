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


</script>

<template>
  <div class="bg-black text-white">
    <!-- Stack all works vertically -->
    <div v-for="(card, i) in cards" :key="card.slug">
      <!-- full-bleed background wrapper (color set via CSS by data-slug) -->
      <div
        class="project-section py-0"
        :data-slug="card.slug"
        :style="{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }"
      >
        <!-- centered content container -->
        <div class="min-h-screen mx-auto w-full max-w-6xl px-8 md:px-16 py-12 border-b border-gray-800 last:border-b-0 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start text-white">
      <!-- LEFT COLUMN: Text Content -->
      <div class="flex flex-col justify-start">
        <!-- Work Title and Author -->
        <div class="mb-8">
          <h2 class="text-5xl md:text-6xl font-bold mb-3">
            {{ card.title }}
          </h2>
          <h3 class="text-lg md:text-xl text-gray-400 font-medium">
            {{ card.name }}
          </h3>
        </div>

        <!-- Markdown Content (hide top-level headings to avoid duplicate title) -->
        <div class="work-content mb-12">
          <component
            v-if="card.component"
            :is="card.component"
            class="prose prose-invert prose-base md:prose-lg max-w-none prose-headings:text-white prose-p:text-gray-300"
          />
        </div>

        <!-- Two smaller images side by side under text -->
        <div v-if="card.allImages.length >= 2" class="grid grid-cols-2 gap-4 mt-8">
          <img
            :src="card.allImages[1]"
            :alt="`${card.title} image 2`"
            class="w-full object-cover"
          />
          <img
            :src="card.allImages[2] || card.allImages[1]"
            :alt="`${card.title} image 3`"
            class="w-full object-cover"
          />
        </div>
      </div>

      <!-- RIGHT COLUMN: Large Hero Image -->
      <div v-if="card.image" class="flex items-start">
        <img
          :src="card.image"
          alt="cover image"
          class="w-full h-auto object-cover"
        />
      </div>
        </div>
      </div>
    </div>
  </div>
</template>
