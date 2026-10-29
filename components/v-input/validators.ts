// Texts for validation errors that come without their own message, by the error's kind.
const ERROR_MESSAGES: Record<string, string> = {
  required: 'Обязательноe поле',
};

const DEFAULT_ERROR_MESSAGE = 'Ошибка';

export function getValidationErrorMessage(kind: string): string {
  return ERROR_MESSAGES[kind] ?? DEFAULT_ERROR_MESSAGE;
}
