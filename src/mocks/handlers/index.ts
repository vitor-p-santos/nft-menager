import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { checkoutHandlers } from './checkout'
import { contentHandlers } from './content'
import { favoritesHandlers } from './favorites'
import { profileHandlers } from './profile'
import { systemHandlers } from './system'
import { walletsHandlers } from './wallets'

// Handlers por domínio são adicionados aqui à medida que cada feature é implementada.
export const handlers = [
  ...systemHandlers,
  ...authHandlers,
  ...catalogHandlers,
  ...contentHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...profileHandlers,
  ...walletsHandlers,
  ...checkoutHandlers,
]
