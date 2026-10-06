// src/validations/role-coach/client.validation.js

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/* -------------------------------------------------------------------------- */
/* Validate Client ID                                                         */
/* -------------------------------------------------------------------------- */

export const validateClientId = (clientId) => {
  if (!clientId) {
    const error = new Error("Client ID is required");
    error.statusCode = 400;
    throw error;
  }

  if (!UUID_REGEX.test(clientId)) {
    const error = new Error("Invalid client ID");
    error.statusCode = 400;
    throw error;
  }

  return clientId;
};