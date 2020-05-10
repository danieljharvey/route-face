import * as Res from './Result'

// what can a Route say to me?
//
export type Response =
  | 'Success' // we matched and the Handler succeeded
  | Failure // this is the correct endpoint, but it fucked up

export type Failure =
  | 'HeaderMismatch'
  | 'BodyMismatch' //
  | 'HandlerError' // an error thrown by the 'user' of the library in the handler

// this let's use the Alt instance to quickly work out whether we need to try
// more routes
export type MatchResult = Res.Result<
  'HowCloseWereWe',
  Response
>

// we're going to use "HowCloseWereWe" to work out which errors to show
