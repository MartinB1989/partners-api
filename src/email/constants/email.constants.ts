export const EMAIL_TEMPLATES = {
  ORDER_CONFIRMATION: {
    uuid: '4b5c05e9-8630-4741-87aa-8704a3df41aa', // Se agregará cuando el template esté disponible en Mailtrap
    name: 'ORDER_CONFIRMATION',
    maxRetries: 3,
  },
};

export const EMAIL_BATCH_CONFIG = {
  BATCH_SIZE: 20, // Tamaño máximo de lotes que recomienda Mailtrap
  BATCH_DELAY_MS: 1000, // Pausa entre lotes para evitar rate limiting
};
