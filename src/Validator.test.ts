import * as V from './Validator'
import * as Res from './Result'
import * as fc from 'fast-check'

describe('Validators', () => {
  describe('integerValidator', () => {
    it('Fails', () => {
      const result = V.integerValidator.validate('poo')
      expect(Res.isSuccess(result)).toBeFalsy()
    })
    it('Succeeds', () => {
      const result = V.integerValidator.validate('234234')
      expect(result).toEqual(Res.success(234234))
    })
  })
  describe('nonEmptyStringValidator', () => {
    it('Fails', () => {
      const result = V.nonEmptyStringValidator.validate('')
      expect(Res.isSuccess(result)).toBeFalsy()
    })
    it('Succeeds', () => {
      const result = V.nonEmptyStringValidator.validate(
        '234234'
      )
      expect(result).toEqual(Res.success('234234'))
    })
  })
  describe('stringLiteralValidator', () => {
    it('Fails', () => {
      const result = V.stringLiteralValidator(
        'dog'
      ).validate('')
      expect(Res.isSuccess(result)).toBeFalsy()
    })
    it('Succeeds', () => {
      const result = V.stringLiteralValidator(
        'dog'
      ).validate('dog')
      expect(result).toEqual(Res.success('dog'))
    })
  })
  describe('Arbitraries', () => {
    it('Creates values', () => {
      const arb = V.getArbitrary(V.integerValidator)
      fc.assert(
        fc.property(arb, (a) => {
          console.log(a)
        })
      )
    })
  })
})
