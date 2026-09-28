# Auth0

Identity is delegated to Auth0. The SPA uses `@auth0/auth0-react`; the API validates Bearer JWTs as an OAuth2 resource server when issuer/audience are configured.

## Frontend (`VITE_*`)

Copy `frontend/.env.example` → `frontend/.env.local`:

| Variable | Purpose |
|----------|---------|
| `VITE_AUTH0_DOMAIN` | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | SPA application client id |
| `VITE_AUTH0_AUDIENCE` | API audience (optional but recommended) |
| `VITE_API_BASE_URL` | `http://localhost:8080` for Vite; empty for Docker/nginx |

Blank Auth0 vars: the app still loads; protected pages redirect when auth is required.

The SPA requests `offline_access` and enables refresh-token fallback so silent API calls work after login.

## Backend

| Variable | Purpose |
|----------|---------|
| `AUTH0_ISSUER_URI` | Issuer URL, typically `https://{domain}/` |
| `AUTH0_AUDIENCE` | API audience |

Without a non-blank issuer, JWT resource-server config stays off and authenticated routes return **403**.

## Callback URLs

Register in the Auth0 application:

- Vite: `http://localhost:5173`
- Docker/nginx: `http://localhost`

Include the same origins in Logout URLs and Web Origins.

## Groups vs Auth0 Organizations

Team vault membership and roles come from the app database (`group_members`), not Auth0 Organization claims. Auth0 only establishes *who* the user is.

## See also

- [Local setup](./local-setup)
- [Vault ownership](/user/concepts/vault-ownership)
- [API overview](/api/overview)
