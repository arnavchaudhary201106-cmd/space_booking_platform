# SpaceBookingPlatform

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.4.

## Development server

To start a local development server, run:

```bash
npm start   # starts the Spring Boot API (:8080) and ng serve (:4200) together
# or individually: npm run start:api / npm run start:web
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Backend (Spring Boot)

The API lives in [`backend/`](backend) (Java 21, Spring Boot 3.5, H2 file database).

```bash
cd backend
mvn spring-boot:run   # http://localhost:8080
mvn test
```

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Log in with `identifier` (username or email) + `password`; returns `accessToken`, `refreshToken` and the user |
| POST | `/api/auth/refresh-token` | Swap a `refreshToken` for a new access + refresh token pair (the old refresh token stops working) |
| POST | `/api/auth/logout` | Revoke a `refreshToken` |
| GET | `/api/auth/me` | The signed-in user |
| POST | `/api/auth/change-password` | Change your own password (`currentPassword`, `newPassword`); returns a new token pair and signs out every other session |
| POST | `/api/users` | Create a user (username: letters, digits, `_`, `-`; 3–30 chars; at least one letter and one number): super admins any role, admins `ADMIN`/`VIEWER` (403 otherwise) |
| GET | `/api/users/username-available?username=` | `{ "available": true/false }` (admins only) |
| GET | `/api/venues` | Hardcoded venue list |
| GET / POST | `/api/events` | List / create events |
| GET / PUT / DELETE | `/api/events/{id}` | Read / update / delete an event |
| GET / POST | `/api/events/{eventId}/venues/{venueId}/stalls` | List booked stalls / book a stall (creates it with its cells) |
| DELETE | `/api/events/{eventId}/venues/{venueId}/stalls/{stallId}` | Delete a booked stall (frees its cells) |
| PATCH | `/api/events/{eventId}/venues/{venueId}/stalls/{stallId}/borders` | Mark borders of a booked stall open or closed |

Frontend routes: `/` (home), `/login`, `/create-user` (admins only), `/venues`, `/events`, and
`/mark-space?eventId=<id>&venueId=<id>` (without `eventId` it is a preview only).
Everything except `/` and `/login` needs a signed-in user.

### Tokens

- **Access token** (JWT, 1 day): sent as `Authorization: Bearer <token>` on every API call.
- **Refresh token** (random, 7 days): stored hashed in the database; each one works once. Refreshing
  returns a new pair, and changing the password revokes all of a user's refresh tokens.
- The frontend interceptor ([auth.interceptor.ts](src/app/interceptors/auth.interceptor.ts)) calls
  `/api/auth/refresh-token` when an API call returns 401, then re-sends that call with the new token.
  Calls that fail while the refresh is running wait for it and are re-sent with the same new token.
  If the refresh token is also rejected, the user is signed out and sent to `/login`.
- Lifetimes: `app.jwt.access-token-minutes` and `app.jwt.refresh-token-days` in `application.properties`.

### Users and roles

| Role | Can do |
| --- | --- |
| `SUPER_ADMIN` | Everything an admin can, plus creating other super admins. The first one is seeded on startup. |
| `ADMIN` | Create `ADMIN` / `VIEWER` users (not super admins); create, edit and delete events; book stalls and change their borders. |
| `VIEWER` | View events, venues and booked stalls. |

On first start a super admin is created: username `superadmin`, password `ChangeMe@123`. Change these
before deploying with the environment variables `APP_SUPER_ADMIN_USERNAME`, `APP_SUPER_ADMIN_EMAIL`,
`APP_SUPER_ADMIN_PASSWORD`, and set `APP_JWT_SECRET` (at least 32 characters) to sign tokens.
Usernames are 3–30 characters (letters, digits, `_`, `-`) with at least one letter and one number;
the seeded `superadmin` name is the one exception because it bypasses the API.
The seed only runs when no super admin exists, so it won't change an existing database.
The H2 console (`/h2-console`) is open without a login, so keep it for local development only.
