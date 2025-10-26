# Karali Full Stack App

Karali is a full stack scheduling and journaling application that combines a Node.js/Express
API, MongoDB persistence, and a React Native (Expo) client. Users can manage personal events,
share activities with friends, log their progress, and receive notifications across devices.

This document covers project setup and the REST API that powers the new friends, shared events,
and notification features.

## Project Structure

```
client/   # React Native (Expo) application
server/   # Express API + MongoDB models/controllers
```

## Prerequisites

- Node.js 18+
- npm 9+
- A MongoDB instance (local or hosted)
- Expo CLI (for running the mobile client)

## Environment Variables

Copy `.env.example` to `.env` and adjust the values for your environment.

| Variable | Description |
| --- | --- |
| `PORT` | Port used by the Express server. |
| `MONGO_URL` | MongoDB connection string. |
| `JWT_SECRET` | Secret used to sign authentication tokens. |
| `EXPO_PUBLIC_API_URL` | Base URL of the API used by the Expo client. |

## Installation & Running

1. Install dependencies at the repository root:

   ```bash
   npm install
   ```

2. Start the backend:

   ```bash
   cd server
   npm start
   ```

   The server listens on `PORT` (default `4000`) and exposes routes under `/api`.

3. Start the Expo client:

   ```bash
   cd client
   npm start
   ```

   Ensure `EXPO_PUBLIC_API_URL` points to the running backend.

## Authentication

The API uses JSON Web Tokens (JWT). After signing up or logging in, include the token in the
`Authorization` header for every protected request:

```
Authorization: Bearer <token>
```

## API Reference

### Users

| Method & Path | Description | Notes |
| --- | --- | --- |
| `POST /api/users/signup` | Register a new user. | Body: `{ username, email, password }`. Returns token + user profile. |
| `POST /api/users/login` | Authenticate by email, username, or friend code. | Body: `{ identifier, password }`. Returns token + user profile. |
| `GET /api/users/search?query=` | Search for users. | Requires auth. Matches `username` (partial) or exact `friendCode`. |

### Friends

| Method & Path | Description | Notes |
| --- | --- | --- |
| `POST /api/friends/requests` | Send a friend request. | Body: `{ toUserId }` or `{ friendCode }`. Prevents duplicates and auto-accepts reciprocal requests. |
| `GET /api/friends/requests` | List pending requests. | Optional `direction=in|out`. Returns `{ incoming, outgoing }`. |
| `PATCH /api/friends/requests/:id` | Accept or reject a request. | Body: `{ status: 'accepted' | 'rejected' }`. Only recipients may respond. |
| `GET /api/friends` | List confirmed friends. | Returns friend profiles with `since` timestamp. |

### Events

| Method & Path | Description | Notes |
| --- | --- | --- |
| `GET /api/events?scope=` | Fetch events. | `scope=personal` for owned events, `scope=shared` for events you own or join, default returns both. |
| `POST /api/events` | Create an event. | Body: `{ title, shared, participants, startsAt, endsAt, color }`. Shared events require selected friends. |
| `PUT /api/events/:id` | Update basic event fields. | Owner-only. |
| `DELETE /api/events/:id` | Delete an event. | Owner-only. |
| `DELETE /api/eventsWithLogs/:id` | Delete event and its logs. | Owner-only. |
| `PATCH /api/events/:id/participants` | Update participants. | Owner-only. Only confirmed friends are allowed. |
| `GET /api/events/:id/participants` | View event participants. | Accessible to owner and participants. |
| `GET /api/events/names` | Retrieve names of accessible events. | Useful for filters/autocomplete. |

### Logs

| Method & Path | Description | Notes |
| --- | --- | --- |
| `GET /api/logs` | List logs. | Supports filters: `fromDate`, `toDate`, `eventId`, `eventName`, `timeOfDay`. Restricted to events you own or join. |
| `POST /api/logs` | Create a new log entry. | Requires `eventId`. Only owners/participants may post. Notifies other participants. |
| `DELETE /api/logs/:id` | Remove a log. | Authors and event owners may delete. |

### Notifications

| Method & Path | Description | Notes |
| --- | --- | --- |
| `GET /api/notifications` | List notifications. | Includes friend requests, acceptances, and shared event logs. |
| `PATCH /api/notifications/:id/read` | Mark notification as read. | Updates `isRead` flag. |

## Friends & Shared Events Workflow

1. Users share their auto-generated `friendCode` or search by username.
2. Sending a request creates a notification for the recipient. Reciprocal pending
   requests are auto-accepted.
3. Accepting a request creates a `Friendship` record and notifies the sender.
4. Shared events may only include confirmed friends. Participants receive
   notifications when new logs are posted.
5. Users can keep track of outstanding requests and unread notifications from the
   sidebar in the mobile client.

## Testing & Verification

- Ensure MongoDB is reachable via `MONGO_URL`.
- Use tools like Postman or Thunder Client to exercise the REST endpoints with
  a valid JWT.
- Run the Expo app, log in, and verify: searching users, sending requests,
  accepting them, creating shared events, adding logs, and observing
  notification badges.

## Further Improvements

- Add automated tests for controller flows and frontend screens.
- Consider caching friend and notification lists to reduce repeated network
  calls.
- Expand account management endpoints for editing profile details.

