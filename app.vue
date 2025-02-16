<script setup lang="ts">
const { x, y } = useMouse()

</script>

<template>
  <div>
    <h1 class="text-5xl font-bold underline">Hello world!</h1>
    <div>pos: {{ x }}, {{ y }}</div>
    <CldImage
      src="https://res.cloudinary.com/dsukmgp91/image/upload/v1739720011/index_esthes_landscape_mtuqvy.jpg"
      width="300"
      height="300"
      quality="auto"
      format="webp"
      alt="My Awesome Image"
    />
  </div>
</template>
