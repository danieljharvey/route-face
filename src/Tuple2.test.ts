import * as T from './Tuple2'

describe('Tuple2', () => {
  describe('pushTuple', () => {
    it('With empty', () => {
      expect(T.pushTuple(3)).toEqual([3])
    })
    it('With items', () => {
      expect(T.pushTuple(3, 1, 2)).toEqual([1, 2, 3])
    })
  })
})
