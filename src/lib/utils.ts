import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * A escala tipográfica do Figma (globals.css: text-body, text-lead…) é customizada. Sem
 * registrá-la, o tailwind-merge confunde `text-body` com cor e o remove quando há um
 * `text-<cor>` na mesma chamada.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['tiny', 'micro', 'caption', 'caption-lg', 'body', 'body-md', 'body-lg', 'body-xl', 'lead', 'title-sm', 'title', 'heading', 'heading-lg', 'display'] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
