// no route found
type PathMismatch = {
  type: 'PathMismatch'
  url: string
  message: string
}

const pathMismatch = (
  url: string,
  message: string
): PathMismatch => ({
  type: 'PathMismatch',
  url,
  message,
})

///////

type MethodMismatch = {
  type: 'MethodMismatch'
  url: string
  message: string
}

const methodMismatch = (
  url: string,
  message: string
): MethodMismatch => ({
  type: 'MethodMismatch',
  url,
  message,
})

// route found, headers wrong
type HeaderMismatch = {
  type: 'HeaderMismatch'
  url: string
  message: string
}

const headerMismatch = (
  url: string,
  message: string
): HeaderMismatch => ({
  type: 'HeaderMismatch',
  url,
  message,
})

/////

// route found, body type wrong
type BodyMismatch = {
  type: 'BodyMismatch'
  url: string
  message: string
}

const bodyMismatch = (
  url: string,
  message: string
): BodyMismatch => ({
  type: 'BodyMismatch',
  url,
  message,
})

//////

// something that happens in the Handler
type HandlerError = {
  type: 'HandlerError'
  url: string
  body: object
}

const handlerError = (
  url: string,
  body: object
): HandlerError => ({
  type: 'HandlerError',
  url,
  body,
})

export type APIError =
  | PathMismatch
  | MethodMismatch
  | HeaderMismatch
  | BodyMismatch
  | HandlerError

export const errors = {
  pathMismatch,
  methodMismatch,
  headerMismatch,
  bodyMismatch,
  handlerError,
}
