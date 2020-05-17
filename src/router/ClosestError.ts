import { APIError, RouteErrors } from './Types'
import * as Res from '../result/Result'

const countPathMatches = (errors: RouteErrors): number =>
  errors.path === null
    ? 0
    : errors.path.matches.filter(Res.isSuccess).length

export const mostRelevantRouteError = <A, B>(
  err1: RouteErrors,
  err2: RouteErrors
): RouteErrors => {
  if (err2.method === null && err1.method !== null) {
    return err2
  }
  if (err1.method === null && err2.method !== null) {
    return err1
  }

  if (err2.path === null) {
    return err2
  }
  if (err1.path === null) {
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
