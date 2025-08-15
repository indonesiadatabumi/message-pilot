# API Token Management

This document describes the API endpoints for managing API tokens. These tokens are JWTs used to authenticate requests to the messaging API endpoints.

## 1. Token Generation

### Endpoint

`POST /api/admin/tokens`

### Description

This endpoint is used by administrators to generate a new API token for a specific user.

### Authentication

This endpoint is protected and requires administrator privileges. Authenticated using JWT.

### Request Body

```json
{
  "userId": "string", // The ID of the user to generate a token for
  "expiration": "string | null" // (Optional) The expiration date of the token in ISO format. If null, the token will not expire.
}
```

### Example Request

```json
{
  "userId": "64ff...",
  "expiration": "2024-12-31T23:59:59.000Z"
}
```

### Response

```json
{
  "success": true,
  "token": "string", // The generated JWT token
  "name": "string" //The user name
}
```

### Example Success Response

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUz...".",
  "name": "Admin User"
}
```

### Example Error Response

```json
{
  "message": "User ID is required",
  "status": 400
}
```

### Code Snippet (from `src/components/admin/generate-token-form.tsx`)

```javascript
const res = await fetch('/api/admin/tokens', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: user.id,
    expiration: expiration ? new Date(expiration).toISOString() : null,
  }),
});
```

### curl Example

```bash
curl -X POST \
  http://localhost:3000/api/admin/tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "userId": "654...",
    "expiration": "2024-12-31T23:59:59.000Z"
  }'
```

### Error Codes

*   `400`: Bad Request - Invalid request body.
*   `401`: Unauthorized - Missing or invalid credentials.
*   `404`: Not Found - User not found.
*   `403`: Forbidden - User is not an administrator.
*   `500`: Internal Server Error - An unexpected error occurred.

## 2. Authentication Middleware

The following API endpoints require a valid JWT token in the `Authorization` header:

*   `POST /api/messages/send-template`
*   `POST /api/messages/send-bulk`
*   `POST /api/messages/send-private`

### Header

`Authorization: Bearer <JWT_TOKEN>`

### Example Usage

To use the messaging API, include the `Authorization` header with a valid JWT:

```bash
curl -X POST \
  http://localhost:3000/api/messages/send-template \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_JWT_TOKEN>" \
  -d '{
    "templateId": "template123",
    "recipientIds": ["contact456", "contact789"],
    "placeholders": {
      "name": "John",
      "event": "Meeting"
    }
  }'
```

### Error Response

If the token is missing or invalid, the server will return a `401 Unauthorized` error with the following JSON response:

```json
{
  "success": false,
  "error": "Unauthorized: Missing or invalid token"
}
```
