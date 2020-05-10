import * as V from '../Validator'

export const methodGet = V.caseInsensitiveStringLiteralValidator(
  'get'
)

export type MethodGet = V.ReturnType<typeof methodGet>

// get<A> :: Headers -> Pieces -> A
// post<Body,A> :: Headers -> Pieces -> Body -> A

export const methodPost = V.caseInsensitiveStringLiteralValidator(
  'post'
)

export type MethodPost = V.ReturnType<typeof methodPost>

export const method = V.oneOf(methodGet, methodPost)

export type Method = V.ReturnType<typeof method>
