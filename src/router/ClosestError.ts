import { APIError, RouteErrors } from './Types'
import * as Res from '../result/Result'

const countPathMatches = (errors: RouteErrors): number =>
  errors.path === 'match'
    ? 0
    : errors.path.matches.filter(Res.isSuccess).length

const isMatch = <A>(a: A | 'match'): a is 'match' =>
  a === 'match'

export const mostRelevantRouteError = <A, B>(
  err1: RouteErrors,
  err2: RouteErrors
): RouteErrors => {
  if (isMatch(err2.method) && !isMatch(err1.method)) {
    return err2
  }
  if (isMatch(err1.method) && !isMatch(err2.method)) {
    return err1
  }

  if (isMatch(err2.path)) {
    return err2
  }
  if (isMatch(err1.path)) {
    return err1
  }

  if (countPathMatches(err2) > countPathMatches(err1)) {
    return err2
  }
  return err1
}

export const mostRelevantFromList = (
  error: RouteErrors,
  ...errors: RouteErrors[]
): RouteErrors =>
  errors.reduce(
    (a, b) => mostRelevantRouteError(a, b),
    error
  )
