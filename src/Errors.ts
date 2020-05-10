// no route found
type NoRouteMatch = {
  type: 'NoRouteMatch'
  url: string
}

const noRouteMatch = (url: string): NoRouteMatch => ({
  type: 'NoRouteMatch',
  url,
})

///////

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
  | NoRouteMatch
  | HeaderMismatch
  | BodyMismatch
  | HandlerError

export const errors = {
  noRouteMatch,
  headerMismatch,
  bodyMismatch,
  handlerError,
}
