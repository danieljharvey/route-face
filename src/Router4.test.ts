import * as R from './Router4'
import * as t from 'io-ts'
import * as Res from './Result'
import { getArbitrary } from 'fast-check-io-ts'
import fc from 'fast-check'

const myRoute = R.makeRoute
  .then(t.literal('dog'))
  .then(t.literal('log'))
  .then(t.literal('bog'))
  .done()

const myRouteArb = getArbitrary(t.tuple(myRoute.pieces))

describe('Router4', () => {
  it('Creates arbitrary valid endpoints', () => {
    fc.assert(
      fc.property(myRouteArb, (arb) => {
        const stringPieces = arb.map(String)
        const validated = R.validate(myRoute, stringPieces)
        return Res.isSuccess(validated)
      })
    )
  })
})
