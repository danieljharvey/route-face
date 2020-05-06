import * as R from './Router4'
import * as t from 'io-ts'
import { getArbitrary } from 'fast-check-io-ts'
import fc from 'fast-check'

const myRoute = R.add(
  R.add(
    R.add(R.pure(t.literal('bum')), t.literal('town')),
    t.number
  ),
  t.string
)

const myRouteArb = getArbitrary(t.tuple(myRoute.pieces))

const myRoute2 = R.makeRoute
  .then(t.literal('dog'))
  .then(t.literal('log'))
  .then(t.literal('bog'))
  .done()

const myRouteArb2 = getArbitrary(t.tuple(myRoute2.pieces))

describe('Router4', () => {
  it('Creates arbitrary valid endpoints', () => {
    fc.assert(
      fc.property(myRouteArb, (arb) => {
        const stringPieces = arb.map(String)
        const validated = R.validate(myRoute, stringPieces)
        console.log(validated)
        return (
          validated.type === 'Failure' ||
          validated.type === 'Success'
        )
      })
    )
  })
})
