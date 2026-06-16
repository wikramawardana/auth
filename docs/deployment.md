# Auth Deployment And OAuth Client Runbook

Auth is the central OIDC provider for Wikra apps. It is deployed on the Wikra
k3s Kubernetes cluster through GitOps.

## Current Production Shape

| Item | Value |
| --- | --- |
| Repository | `wikramawardana/auth` |
| Image | `ghcr.io/wikramawardana/auth:v<package-version>-build.<run-number>` |
| Kubernetes namespace | `wikra-apps` |
| Kubernetes app/deployment | `auth` |
| Container port | `3000` |
| Public domain | `https://auth.wikra.my.id` |
| GitOps app | `wikra-gitops/apps/40-auth.yaml` |
| GitOps image tag | `wikra-gitops/manifests/auth/overlays/prod/kustomization.yaml` |
| Runtime secrets | Vault KV v2 path `secret/auth`, synced by ExternalSecret `auth-env` |

## Required GitHub Actions Secrets

```text
NEXT_PUBLIC_APP_URL=https://auth.wikra.my.id
GH_PAT or GITOPS_TOKEN=<token that can push to wikra-gitops>
```

## Required Vault Secret

Vault path `secret/auth` must contain:

```text
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://auth.wikra.my.id
BETTER_AUTH_SECRET=<production secret>
DATABASE_URL=<production PostgreSQL URL>
GOOGLE_CLIENT_ID=<Google OAuth client id>
GOOGLE_CLIENT_SECRET=<Google OAuth client secret>
ALLOWED_ORIGINS=https://dapurbuwikra.biz.id,https://oops.wikra.my.id,https://tuwaga.wikra.my.id
```

Add every app origin that uses Auth to `ALLOWED_ORIGINS`.

## Normal Deploy Flow

1. Make changes locally.
2. Run checks:

   ```bash
   pnpm lint
   pnpm build
   ```

3. Commit and push to `main`.
4. GitHub Actions reads `package.json` `version`, then builds and pushes an
   immutable image tag such as
   `ghcr.io/wikramawardana/auth:v0.1.0-build.123`.
5. The workflow updates:

   ```text
   wikra-gitops/manifests/auth/overlays/prod/kustomization.yaml
   ```

   The `newTag` value must be a version-build tag, not a git commit SHA.

6. Argo CD syncs the GitOps change into Kubernetes.
7. Verify production.

## Verification Commands

From the VPS:

```bash
kubectl -n wikra-apps get deploy auth \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'

kubectl -n wikra-apps rollout status deploy/auth
kubectl -n wikra-apps logs deploy/auth --tail=100
curl -fsSIL https://auth.wikra.my.id
```

## Registering A New Product Client

1. Open Auth dashboard.
2. Create OAuth client for the product.
3. Add redirect URL:

   ```text
   https://<product-domain>/api/auth/oauth2/callback/auth
   ```

4. Save the generated client id and secret into the product Vault path.
5. Add the product origin to Auth `ALLOWED_ORIGINS` in Vault.
6. Force ExternalSecret sync or wait for it:

   ```bash
   kubectl -n wikra-apps annotate externalsecret auth-env force-sync=$(date +%s) --overwrite
   kubectl -n wikra-apps rollout restart deploy/auth
   ```

7. Restart the product deployment after its env changes sync.

## Tuwaga OAuth Notes

Tuwaga production uses:

```text
Origin:       https://tuwaga.wikra.my.id
Redirect URL: https://tuwaga.wikra.my.id/api/auth/oauth2/callback/auth
```

If Tuwaga login redirects to the Auth home page or fails with
`invalid_client`, check:

- The Tuwaga FE `AUTH_CLIENT_ID` matches the production Auth DB client.
- The Auth DB has the Tuwaga client and redirect URL.
- `ALLOWED_ORIGINS` includes `https://tuwaga.wikra.my.id`.
- User app role for the Tuwaga client is `admin` when accessing `/admin`.

## Important

Do not fix production by only patching the generated Kubernetes Secret. The
ExternalSecret controller will overwrite it from Vault. Patch Vault first, then
force ExternalSecret sync and restart the deployment.
