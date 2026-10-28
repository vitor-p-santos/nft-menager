import { z } from 'zod'

/**
 * Mensagens padrão do Zod em português (as dos schemas do projeto já são próprias). Vale para o app
 * e para a API simulada, que usam a mesma instância: sem isso, um corpo malformado voltava com
 * "Invalid input: expected int, received number". Importado primeiro no `main.tsx`.
 */
z.config(z.locales.ptBR())
