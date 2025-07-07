# **App Name**: MessagePilot

## Core Features:

- Contact Management: Manage contacts by adding, editing, and deleting contact information.
- Template Management: Create and manage message templates with placeholders for personalized content.
- Scheduled Messaging: Schedule messages (private or broadcast) to be sent at a specified date and time.

## Style Guidelines:

- Primary color: Light Teal (#A0CED9) for a calm and professional feel.
- Secondary color: Soft Gray (#E5E5E5) for backgrounds and subtle contrasts.
- Accent: Blue (#468B97) for interactive elements and highlights.
- Clean and intuitive layout with a focus on usability.
- Use clear and recognizable icons for different actions.

## API Documentation: Template Messages

These API endpoints allow external systems to send single or bulk template messages through MessagePilot.

### Send Single Template Message

-   **Method**: `POST`
-   **Endpoint**: `/api/send-template-message/single`
-   **Description**: Sends a single template message to a specific recipient, filling in template parameters with provided data.
-   **Authentication**: Requires an `X-API-Key` header with a valid API key.
-   **Request Body (JSON)**:


