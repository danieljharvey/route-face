import * as R from './Router4'
import * as t from 'io-ts'
import * as Res from './Result'
// import { getArbitrary } from 'fast-check-io-ts'
// import fc from 'fast-check'
import { NumberFromString } from 'io-ts-types/lib/NumberFromString'

// an example route would be /dog/400/bog/
const myRoute = R.makeRoute
  .path('dog')
  .number()
  .path('bog')
  .done()

// type MyRoute = ['dog', number, 'bog']
type MyRoute = R.RouteTypes<typeof myRoute>

export const testMyRoute: MyRoute = ['dog', 100, 'bog']

describe('Router4', () => {
  it('Validates a path is wrong', () => {
    const result = R.validatePath(myRoute, [
      'things',
      'oh',
      'well',
    ])
    expect(Res.isSuccess(result)).toBeFalsy()
  })
  it('Validates a path is right', () => {
    const result = R.validatePath(myRoute, [
      'dog',
      '100',
      'bog',
    ])
    expect(Res.isSuccess(result)).toBeTruthy()
    expect(result.value).toEqual(['dog', 100, 'bog'])
  })

  const routeWithHeaders = R.extendRoute(myRoute)
    .stringHeader('x-user-name')
    .numberHeader('x-user-id')
    .done()

  it('Adding headers does not affect path results', () => {
    const pathResult = R.validatePath(routeWithHeaders, [
      'dog',
      '100',
      'bog',
    ])
    expect(Res.isSuccess(pathResult)).toBeTruthy()
  })

  it('Fails because a header is missing', () => {
    const headerResult = R.validateHeaders(
      routeWithHeaders,
      {}
    )
    expect(Res.isSuccess(headerResult)).toBeFalsy()
  })

  it('Succeds when headers are provided', () => {
    const headerResult = R.validateHeaders(
      routeWithHeaders,
      {
        'x-user-name': 'DOGMAN',
        'x-user-id': '123123',
      }
    )
    expect(Res.isSuccess(headerResult)).toBeTruthy()
    expect(headerResult.value).toEqual({
      'x-user-name': 'DOGMAN',
      'x-user-id': 123123,
    })
  })
})

// the arbitraries we are using is broken
// re-enable this test once we are using our own validators
/*
 * const myRouteArb = getArbitrary(
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
*/
