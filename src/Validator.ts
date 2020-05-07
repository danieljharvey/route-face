import * as Res from './Result'
import * as fc from 'fast-check'
// string validators
// like io-ts but specialised to string -> maybe A

class Validator<Name extends string, A> {
  readonly _A!: A
  readonly decode: (str: string) => Res.Result<string, A>
  readonly name: Name
  constructor(
    name: Name,
    decode: (str: string) => Res.Result<string, A>
  ) {
    this.decode = decode
    this.name = name
  }

  validate = (str: string): Res.Result<string, A> => {
    return this.decode(str)
  }

  decodeOrThrow = (str: string): A => {
    const a = this.decode(str)
    if (Res.isFailure(a)) {
      throw 'This cowabunga lifestyle has backfired'
    }
    return a.value
  }
}

export type AnyValidator = Validator<string, any>

export type ReturnType<V> = V extends AnyValidator
  ? V['_A']
  : never

const validator = <Name extends string, A>(
  name: Name,
  validate: (str: string) => Res.Result<string, A>
): Validator<Name, A> => new Validator(name, validate)

export const integerValidator = validator<
  'integer',
  number
>('integer', (a) => {
  const i = parseInt(a, 10)
  return i
    ? Res.success(i)
    : Res.failure(`Could not parse ${a} into an integer`)
})

export const nonEmptyStringValidator = validator<
  'nonEmptyString',
  string
>('nonEmptyString', (a) =>
  a.length > 0
    ? Res.success(a)
    : Res.failure('String must be non-empty')
)

export const stringLiteralValidator = <
  Literal extends string
>(
  lit: Literal
) =>
  validator<'Literal', Literal>('Literal', (a) =>
    a === lit
      ? Res.success(lit)
      : Res.failure(`${a} does not match ${lit}`)
  )

export const getArbitrary = <Name extends string, A>(
  validator: Validator<Name, A>
): fc.Arbitrary<A> =>
  fc
    .string()
    .filter((a) => Res.isSuccess(validator.validate(a)))
    .map(validator.decodeOrThrow)
