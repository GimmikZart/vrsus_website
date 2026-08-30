import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'no-console': 'warn',
    // Prettier formats Vue void elements as self-closing; keep the two gates
    // consistent because this syntax is valid in Vue templates.
    'vue/html-self-closing': 'off',
  },
})
