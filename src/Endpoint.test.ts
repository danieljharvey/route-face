import * as EP from './Endpoint'
import * as R from './router/Router'
import * as t from 'io-ts'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'

describe('Endpoint', () => {
  describe('get', () => {
    // posts/100/view/
    const getRoute = R.makeRoute()
      .path('posts')
      .number()
      .path('view')
      .stringHeader('secret-token')
      .done()

    const getSample = EP.fromRoute(
      getRoute,
      ({ headers }) =>
        TE.fromEither(
          headers['secret-token'] === 'costanza' ||
            headers['secret-token'] === 'elaine'
            ? E.right('good')
            : E.left('bad')
        )
    )

    it('Runs a get endpoint and totally nails the password', done => {
      getSample({
        method: 'get',
        headers: { 'secret-token': 'costanza' },
        url: '/posts/100/view/',
        postData: {},
      })().then(a => {
        expect(a).toEqual('good')
        done()
      })
    })
  })

  describe('post', () => {
    const samplePostData = t.type({
      name: t.string,
      age: t.number,
    })

    // posts/100/view/
    const postRoute = R.makeRoute()
      .path('posts')
      .number()
      .path('view')
      .stringHeader('secret-token')
      .post(samplePostData)
      .done()

    const postSample = EP.fromRoute(
      postRoute,
      ({ headers }) =>
        TE.fromEither(
          headers['secret-token'] === 'costanza' ||
            headers['secret-token'] === 'elaine'
            ? E.right('good')
            : E.left('bad')
        )
    )

    it('Runs a post endpoint and totally nails the password', done => {
      postSample({
        method: 'post',
        headers: { 'secret-token': 'costanza' },
        url: '/posts/100/view/',
        postData: { name: 'kramer', age: 200 },
      })().then(a => {
        expect(a).toEqual('good')
        done()
      })
    })
  })
})
