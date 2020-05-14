import * as V from './Validator'
import * as Res from '../result/Result'
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
  describe('OneOf', () => {
    it('Fails them all', () => {
      const result = V.oneOf(
        V.stringLiteralValidator('dog'),
        V.stringLiteralValidator('log')
      ).validate('pog')
      expect(Res.isFailure(result)).toBeTruthy()
    })
    it('Succeeds on one', () => {
      const result = V.oneOf(
        V.stringLiteralValidator('dog'),
        V.stringLiteralValidator('pog'),
        V.stringLiteralValidator('log')
      ).validate('pog')
      expect(result).toEqual(Res.success('pog'))
    })
  })
  describe('Arbitraries', () => {
    it('Creates values', () => {
      const arb = V.getArbitrary(V.integerValidator)
      fc.assert(
        fc.property(arb, (a) => {
          expect(Number.isInteger(a)).toBeTruthy()
        })
      )
    })
  })
})
