import { getValidationErrorMessage } from './validators';

describe('getValidationErrorMessage', () => {
  it('has a text for a missing required value', () => {
    expect(getValidationErrorMessage('required')).toBe('Обязательноe поле');
  });

  it('falls back to a generic text for any other kind', () => {
    expect(getValidationErrorMessage('pattern')).toBe('Ошибка');
    expect(getValidationErrorMessage('weightExpression')).toBe('Ошибка');
  });
});
