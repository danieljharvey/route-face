import * as R from './Router4'
import * as t from 'io-ts'
import * as Res from './Result'
import { getArbitrary } from 'fast-check-io-ts'
import fc from 'fast-check'

const myRoute = R.makeRoute
  .path('dog')
  .number()
  .path('bog')
  .done()

// type MyRoute = ['dog', number, 'bog']
type MyRoute = R.RouteTypes<typeof myRoute>

export const testMyRoute: MyRoute = ['dog', 100, 'bog']

const myRouteArb = getArbitrary(
  t.tuple(myRoute.pieces) as any
)

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
