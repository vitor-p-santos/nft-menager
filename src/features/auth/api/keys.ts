/** Query keys da auth. `me` é privada: sai do cache em toda troca de identidade. */
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
}
