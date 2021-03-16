import * as V from './Validator'
import * as fc from 'fast-check'
import * as E from 'fp-ts/Either'

describe('Validators', () => {
  describe('integerValidator', () => {
    it('Fails', () => {
      const result = V.integerValidator.validate('poo')
      expect(E.isRight(result)).toBeFalsy()
    })
    it('Succeeds', () => {
      const result = V.integerValidator.validate('234234')
      expect(result).toEqual(E.right(234234))
    })
  })
  describe('nonEmptyStringValidator', () => {
    it('Fails', () => {
      const result = V.nonEmptyStringValidator.validate('')
      expect(E.isRight(result)).toBeFalsy()
    })
    it('Succeeds', () => {
      const result = V.nonEmptyStringValidator.validate(
        '234234'
      )
      expect(result).toEqual(E.right('234234'))
    })
  })
  describe('stringLiteralValidator', () => {
    it('Fails', () => {
      const result = V.stringLiteralValidator(
        'dog'
      ).validate('')
      expect(E.isRight(result)).toBeFalsy()
    })
    it('Succeeds', () => {
      const result = V.stringLiteralValidator(
        'dog'
      ).validate('dog')
      expect(result).toEqual(E.right('dog'))
    })
  })
  describe('OneOf', () => {
    it('Fails them all', () => {
      const result = V.oneOf(
        V.stringLiteralValidator('dog'),
        V.stringLiteralValidator('log')
      ).validate('pog')
      expect(E.isLeft(result)).toBeTruthy()
    })
    it('Succeeds on one', () => {
      const result = V.oneOf(
        V.stringLiteralValidator('dog'),
        V.stringLiteralValidator('pog'),
        V.stringLiteralValidator('log')
      ).validate('pog')
      expect(result).toEqual(E.right('pog'))
    })
  })
  describe('Arbitraries', () => {
    it('Creates values', () => {
      const arb = V.getArbitrary(V.integerValidator)
      fc.assert(
        fc.property(arb, a => {
          expect(Number.isInteger(a)).toBeTruthy()
        })
      )
    })
  })
})
