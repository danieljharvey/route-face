import * as Res from './Result'

describe('Result', () => {
  describe('All', () => {
    it('Returns first fail', () => {
      expect(
        Res.all([Res.success('Hello'), Res.failure('Poo')])
      ).toEqual(Res.failure('Poo'))
    })
    it('Returns them all in an array if things are fine', () => {
      expect(
        Res.all([Res.success('Hello'), Res.success('Poo')])
      ).toEqual(Res.success(['Hello', 'Poo']))
    })
  })
  describe('First', () => {
    it('Returns last failure when no successes', () => {
      expect(
        Res.first(Res.failure('oh'), Res.failure('no'))
      ).toEqual(Res.failure('no'))
    })
    it('Returns first success', () => {
      expect(
        Res.first(Res.failure('oh'), Res.success('yes'))
      ).toEqual(Res.success('yes'))
    })
  })
})
