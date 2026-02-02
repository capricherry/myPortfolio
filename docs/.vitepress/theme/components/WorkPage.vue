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

for (const path in markdownFiles) {
  const raw = markdownFiles[path] as string
  const lines = raw.split('\n')

  const titleLine = lines.find(line => line.startsWith('# '))
  const nameLine = lines.find(line => line.startsWith('## '))
  const excerptLine = lines.find(line => line.trim() && !line.startsWith('#'))

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
    allImages: workImages
  })
}


</script>

<template>
  <div class="w-full bg-white">
    <!-- Stack all works vertically -->
    <div
      v-for="card in cards"
      :key="card.slug"
      class="min-h-screen flex flex-col justify-center p-6 md:p-12 border-b border-gray-300 last:border-b-0"
    >
      <!-- Work Title and Author -->
      <div class="mb-8">
        <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
          {{ card.title }}
        </h2>
        <h3 class="text-lg md:text-xl text-gray-600 font-medium">
          {{ card.name }}
        </h3>
      </div>

      <!-- Cover Image -->
      <div v-if="card.image" class="mb-8">
        <img
          :src="card.image"
          alt="cover image"
          class="w-full max-h-[600px] object-cover rounded-lg border border-gray-300"
        />
      </div>

      <!-- Markdown Content -->
      <component
        v-if="card.component"
        :is="card.component"
        class="prose prose-base md:prose-lg max-w-none mb-12"
      />

      <!-- Gallery of all images -->
      <div v-if="card.allImages.length > 0" class="mt-12">
        <h3 class="text-2xl font-semibold mb-8 text-gray-900">Gallery</h3>
        <div class="space-y-8 flex flex-col">
          <img
            v-for="(img, idx) in card.allImages"
            :key="idx"
            :src="img"
            :alt="`${card.title} image ${idx + 1}`"
            class="w-full object-cover rounded-lg border border-gray-300"
          />
        </div>
      </div>
    </div>
  </div>
</template>
