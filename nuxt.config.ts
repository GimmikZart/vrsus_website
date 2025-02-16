import tailwindcss from "@tailwindcss/vite";
import 'dotenv/config'
console.log(process.env.CLOUDINARY_CLOUD_NAME);
console.log(process.env.CLOUDINARY_API_KEY);



export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME
    }
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  modules: [
    '@vueuse/nuxt',
    '@nuxtjs/seo',
    '@nuxtjs/cloudinary'
  ],
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    uploadPreset: 'my-custom-preset',
    apiKey: process.env.CLOUDINARY_API_KEY,
    analytics: true,
    cloud: {},
    url: {},
  }
})
