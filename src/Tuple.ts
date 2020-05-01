export type Prepend<Tuple extends any[], Addend> = ((
  _: Addend,
  ..._1: Tuple
) => any) extends (..._: infer Result) => any
  ? Result
  : never

export type Reverse<
  Tuple extends any[],
  Prefix extends any[] = []
> = {
  0: Prefix
  1: ((..._: Tuple) => any) extends (
    _: infer First,
    ..._1: infer Next
  ) => any
    ? Reverse<Next, Prepend<Prefix, First>>
    : never
}[Tuple extends [any, ...any[]] ? 1 : 0]

export const reverseTuple = <A, As extends any[]>(
  a: A,
  ...as: As
) => [a, ...as].reverse() as Reverse<Cons<A, As>>

// const nice = reverseTuple(1, 2, 'poo')

export type Cons<H, T extends any[]> = ((
  h: H,
  ...t: T
) => void) extends (...u: infer U) => void
  ? U
  : never

export const consTuple = <A, As extends any[]>(
  a: A,
  ...as: As
) => [a, ...as] as Cons<A, As>

// const done = consTuple(100, 'loves', 'dogs')

// const more = consTuple(200, ...done)

export type Tail<T extends any[]> = ((
  ...args: T
) => void) extends (head: any, ...tail: infer U) => any
  ? U
  : never

export const tailTuple = <As extends any[]>(...as: As) =>
  [...as].slice(1) as Tail<As>

const tailed = tailTuple(100, 'loves', 'dogs')

// console.log('tailed', tailed)
