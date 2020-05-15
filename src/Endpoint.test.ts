import * as J from './job/job'
import * as E from './Endpoint'
import * as R from './router/Router'
import * as Res from './result/Result'
import * as t from 'io-ts'

describe('Endpoint', () => {
  describe('get', () => {
    // posts/100/view/
    const getRoute = R.makeRoute()
      .path('posts')
      .number()
      .path('view')
      .stringHeader('secret-token')
      .done()

    const getSample = E.fromRoute(getRoute, ({ headers }) =>
      J.fromResult(
        headers['secret-token'] === 'costanza' ||
          headers['secret-token'] === 'elaine'
          ? Res.success('good')
          : Res.failure('bad')
      )
    )

    it('Runs a get endpoint and totally nails the password', done => {
      J.runToPromise(
        getSample({
          method: 'get',
          headers: { 'secret-token': 'costanza' },
          url: '/posts/100/view/',
          postData: {},
        })
      ).then(a => {
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

    const postSample = E.fromRoute(
      postRoute,
      ({ headers }) =>
        J.fromResult(
          headers['secret-token'] === 'costanza' ||
            headers['secret-token'] === 'elaine'
            ? Res.success('good')
            : Res.failure('bad')
        )
    )

    it('Runs a post endpoint and totally nails the password', done => {
      J.runToPromise(
        postSample({
          method: 'post',
          headers: { 'secret-token': 'costanza' },
          url: '/posts/100/view/',
          postData: { name: 'kramer', age: 200 },
        })
      ).then(a => {
        expect(a).toEqual('good')
        done()
      })
    })
  })
})
