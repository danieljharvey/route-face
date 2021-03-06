import * as Res from './result/Result'

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

// todo: this is weak as fuck
export type APIResponse = {
  status: number
  body: object | string
}

export const apiSuccess = (
  body: object | string,
  status = 200
): APIResponse => ({
  status,
  body,
})

export const apiFailure = (
  body: object | string,
  status = 401
): APIResponse => ({ status, body })
