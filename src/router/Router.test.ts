import * as R from './Router'
import * as t from 'io-ts'
import * as E from 'fp-ts/Either'

// an example route would be /dog/400/bog/
const myRoute = R.makeRoute()
  .path('dog')
  .number()
  .path('bog')
  .done()

// type MyRoute = ['dog', number, 'bog']
type MyRoute = R.RouteTypes<typeof myRoute>

export const testMyRoute: MyRoute = ['dog', 100, 'bog']

describe('Router4', () => {
  it('Validates a path is wrong', () => {
    const result = R.validatePath(myRoute.pieces, [
      'things',
      'oh',
      'well',
    ])
    expect(E.isRight(result)).toBeFalsy()
  })
  it('Validates a path is right', () => {
    const result = R.validatePath(myRoute.pieces, [
      'dog',
      '100',
      'bog',
    ])
    expect(E.isRight(result)).toBeTruthy()
    expect(result.value).toEqual(['dog', 100, 'bog'])
  })

  const routeWithHeaders = R.extendRoute(myRoute)
    .stringHeader('x-user-name')
    .numberHeader('x-user-id')
    .done()

  it('Adding headers does not affect path results', () => {
    const pathResult = R.validatePath(
      routeWithHeaders.pieces,
      ['dog', '100', 'bog']
    )
    expect(E.isRight(pathResult)).toBeTruthy()
  })

  it('Fails because a header is missing', () => {
    const headerResult = R.validateHeaders(
      routeWithHeaders.headers,
      {}
    )
    expect(E.isRight(headerResult)).toBeFalsy()
  })

  it('Succeds when headers are provided', () => {
    const headerResult = R.validateHeaders(
      routeWithHeaders.headers,
      {
        'x-user-name': 'DOGMAN',
        'x-user-id': '123123',
      }
    )
    expect(E.isRight(headerResult)).toBeTruthy()
    expect(headerResult.value).toEqual({
      'x-user-name': 'DOGMAN',
      'x-user-id': 123123,
    })
  })
})

describe('validateRequestWithRoute', () => {
  it('Returns path error', () => {
    const result = R.validateRequestWithRoute(myRoute, {
      url: '/dog/one',
      headers: {},
      method: 'get',
      postData: {},
    })

    expect(E.isLeft(result)).toBeTruthy()

    if (E.isLeft(result)) {
      const pathMatches =
        (result.value.path !== 'match' &&
          result.value.path.matches) ||
        []
      expect(R.isRight(pathMatches[0])).toBeTruthy()
      expect(pathMatches[1]).toEqual(
        Res.failure({
          expected: 'NumberFromString',
          value: 'one',
        })
      )
      expect(pathMatches[2]).toEqual(
        Res.failure({
          expected: '"bog"',
          value: undefined,
        })
      )
    }
  })

  it('Returns method error when wrong type', () => {
    const result = R.validateRequestWithRoute(myRoute, {
      url: '/dog/one',
      headers: {},
      method: 'post',
      postData: {},
    })

    expect(E.isLeft(result)).toBeTruthy()

    if (E.isLeft(result)) {
      const error = result.value.method
      expect(error).toEqual({
        type: 'MethodError',
        matches: {
          expected: 'get',
          value: 'post',
        },
      })
    }
  })

  it('Returns header error when headers are missing', () => {
    const routeWithHeaders = R.extendRoute(myRoute)
      .stringHeader('nice-header')
      .numberHeader('user-id')
      .done()
    const result = R.validateRequestWithRoute(
      routeWithHeaders,
      {
        url: '/dog',
        headers: {
          'user-id': 'One',
          'nice-header': 'test',
        },
        method: 'get',
        postData: {},
      }
    )

    expect(E.isLeft(result)).toBeTruthy()
    if (E.isLeft(result)) {
      const matches =
        (result.value.headers !== 'match' &&
          result.value.headers.matches) ||
        []
      expect(matches[0]).toEqual(
        Res.success({ name: 'nice-header', value: 'test' })
      )
      expect(matches[1]).toEqual(
        Res.failure({
          name: 'user-id',
          value: {
            expected: 'NumberFromString',
            value: 'One',
          },
        })
      )
    }
  })

  it('Ignore postData with a Get request', () => {
    const result = R.validateRequestWithRoute(myRoute, {
      url: 'dog',
      headers: {},
      method: 'get',
      postData: { blah: 'blah' },
    })
    expect(E.isLeft(result)).toBeTruthy()
    expect(
      E.isLeft(result) && result.left.postData
    ).toEqual('match')
  })

  it('Returns list of validation errors for postData with a Post request', () => {
    const postRoute = R.extendRoute(myRoute)
      .post(t.type({ name: t.string, age: t.number }))
      .done()
    const result = R.validateRequestWithRoute(postRoute, {
      url: 'dog',
      headers: {},
      method: 'done',
      postData: { name: 'blah' },
    })
    expect(E.isLeft(result)).toBeTruthy()
    if (E.isLeft(result)) {
      const errors =
        (result.left.postData !== 'match' &&
          result.left.postData.errors) ||
        []
      expect(errors).toHaveLength(1)
    }
  })
})
