/** @type {import('prettier').Config} */
export default {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  // Git converte i file in CRLF al checkout quando core.autocrlf e attivo.
  // 'auto' accetta il fine riga esistente ed evita che format:check fallisca
  // su ogni file del repository. Vedi DEC-028.
  endOfLine: 'auto',
  plugins: ['prettier-plugin-tailwindcss'],
}
