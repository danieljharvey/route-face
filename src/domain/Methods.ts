import * as V from '../Validator'

export const methodGet = V.caseInsensitiveStringLiteralValidator(
  'get'
)

// get<A> :: Headers -> Pieces -> A
// post<Body,A> :: Headers -> Pieces -> Body -> A

export const methodPost = V.caseInsensitiveStringLiteralValidator(
  'post'
)

export const method = V.oneOf(methodGet, methodPost)

export type Method = V.ReturnType<typeof method>
