# Flujo de ramas y releases

Esta es la politica base del repo: como se llaman las ramas, a donde se mergea cada tipo de
cambio, como se prueba antes de llegar a produccion, y como se versiona cada release. Se sigue
siempre, salvo que se documente una excepcion (ver "Hotfixes" mas abajo).

No es Git Flow completo -- no hay ramas `release/*` ni `hotfix/*` de larga vida. Es
`develop` + `main`, con tags marcando cada release.

## Las dos ramas largas

| Rama      | Que es                                    | Que la actualiza                          | Que apunta ahi en Dokploy |
|-----------|--------------------------------------------|--------------------------------------------|----------------------------|
| `develop` | Integracion -- todo el trabajo en curso    | PRs de `feat/*`, `fix/*`, `chore/*`, `docs/*` | App de **staging** (`staging.mievento.com.bo`, DB propia) |
| `main`    | Produccion -- solo codigo ya probado       | Merge de `develop` cuando se corta un release | App de **produccion** (`mievento.com.bo`) |

`main` nunca recibe un feature branch directamente. Solo recibe `develop` completo, de una vez,
cuando se decide que lo que hay en staging esta listo para salir.

## Ramas de trabajo

Igual que hasta ahora: `feat/algo`, `fix/algo`, `chore/algo`, `docs/algo`, creadas desde
`develop` (no desde `main`), con su PR apuntando de vuelta a `develop`.

```bash
git checkout develop
git pull --ff-only origin develop
git checkout -b feat/algo
# ... trabajo, commits ...
git push -u origin feat/algo
gh pr create --base develop --title "..." --body "..."
```

Se prueba en local antes del PR como siempre. Una vez mergeado a `develop`, Dokploy redeploya
staging automaticamente y ahi se prueba con la app corriendo de verdad (no solo el diff) antes de
que ese cambio llegue a produccion.

## Cortar un release

Cuando `develop` (= staging) ya se probo y esta listo para produccion, se abre un PR de
`develop` a `main` -- a diferencia de un feature branch, este PR no pide una revision nueva (el
codigo ya se reviso al entrar a `develop`), es solo para dejar un registro/changelog visual de
cada release en GitHub:

```bash
git push origin develop
gh pr create --base main --head develop --title "Release vYYYY.MM.N" --body "..."
```

Al mergear ese PR (merge commit normal, no squash -- para conservar el historial completo de
`develop`), se tagea el resultado y se pushea el tag:

```bash
git checkout main
git pull --ff-only origin main
git tag v2026.09.1
git push origin main --tags
```

Dokploy redeploya produccion automaticamente al recibir el push a `main`.

### Versionado: `vYYYY.MM.N`

- `YYYY.MM` es el año y mes del release (`2026.09`).
- `N` es un contador que arranca en `1` y sube por cada release dentro de ese mismo mes
  (`v2026.09.1`, `v2026.09.2`, `v2026.09.3`...). Vuelve a `1` el mes siguiente.
- No es SemVer (no hay "breaking change = mayor") porque esto es una sola app desplegada, no una
  libreria con consumidores externos -- lo que importa es *cuando* salio cada release, no
  compatibilidad entre versiones.

Para saber el proximo numero: `git tag -l "v$(date +%Y.%m).*" | sort -V | tail -1`.

## Hotfixes (la unica excepcion)

Si produccion tiene un bug urgente y `develop` tiene trabajo a medias que no esta listo para
salir, no se espera a que `develop` este limpio:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b fix/nombre-del-bug
# ... fix minimo, sin arrastrar nada de develop ...
git push -u origin fix/nombre-del-bug
gh pr create --base main --title "..." --body "..."
```

Al mergear ese PR a `main`, se tagea igual (`vYYYY.MM.N`) y **se hace merge de vuelta a
`develop`** para que el fix no se pierda en el proximo release normal:

```bash
git checkout develop
git pull --ff-only origin develop
git merge --no-ff main
git push origin develop
```

## Por que asi y no `release/*` por version

La alternativa considerada era una rama `release/vX` por cada version, ademas de `develop` y
`main`. Se descarto: para un equipo chico (practicamente un solo dev en este repo), una rama por
release es una tercera linea que hay que mantener sincronizada sin aportar mas que lo que ya da
un tag -- un tag es un puntero inmutable y liviano a "esto es lo que salio en tal fecha", sin
necesidad de mergear nada de vuelta desde ahi. `develop` + tags en `main` da el mismo historial
de versiones con menos partes moviles.

## Ver tambien

- [docs/deploy/dokploy-runbook.md](../deploy/dokploy-runbook.md) -- conectarse al servidor,
  migraciones, troubleshooting conocido. Se actualiza para reflejar las dos apps (staging +
  produccion) cuando el setup de staging este listo en Dokploy.
