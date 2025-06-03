# Copilot Instructions (Concise Edition)

> **Purpose** A single, quick‑reference guide for all contributors. Keep code and docs in sync.

---

## 1. Tech Stack

- **Backend:** .NET 8 · EF Core · AutoMapper · FluentValidation
- **Cloud (Azure PaaS only):** App Service, Functions, Container Apps, Cosmos DB, SQL DB, Storage, Service Bus, Key Vault, Application Insights
- **DevOps:** Azure DevOps + Bicep · All pipelines YAML · Use **`AzureWebApp`** task (never `AzureRmWebAppDeployment`).
- **Testing:** XUnit + FluentAssertions

## 2. Repo Layout (trimmed)

```
src/      domain, application, infra, persistence, api, worker
 docs/    all documentation (see table)
 tests/   unit, integration, functional
 pipelines/Project.Name/  YAML + bicep/
```

## 3. Key Documents

| File            | Purpose                                   |
| --------------- | ----------------------------------------- |
| **PRD.md**      | Functional requirements (source of truth) |
| ROADMAP.md      | Milestones derived from PRD               |
| STATE.md        | Machine‑readable progress tracker         |
| ARCHITECTURE.md | Design & IaC details                      |
| DEPLOYMENT.md   | Release procedures                        |
| TESTING.md      | Test strategy                             |
| API.md          | Swagger / OpenAPI notes                   |
| SECURITY.md     | Security guidelines                       |
| README.md       | Project overview                          |

> **Always update the relevant docs when you change code, tests, or pipelines.**

## 4. Pipelines (YAML)

1. **pipeline‑orchestrator.yml** – build ➜ multienv release (dev→tst→acc→prd).
2. **pipeline‑build.yml** – restore, build, test, publish artifacts & bicep.
3. **pipeline‑release.yml** – deploy infra (Bicep) then app; param `EnvironmentType` (dev|tst|acc|prd).
4. **variables** – shared `variables.yml` + per‑env `<env>.variables.yml`.

## 5. Bicep & Naming

- IaC lives in `pipelines/Project.Name/bicep/` (`main.bicep`, `utilities.bicep`, `resourcegroup.bicep`).
- **Naming:** lowercase + `-`, suffixed with env (`dev`, `tst`, `acc`, `prd`); include region code only for multi‑region (`we`, `ne`, …).
- **Resource groups:** `<purpose>[-<component>]-<env>` – Tag `EnvironmentType` & **ask** for `CmdbApplicationId`.
- Follow patterns: App Service `app‑…`, Storage `st…`, Key Vault `kv‑…`.

## 6. Mandatory Workflow

1. **Define requirements** – Update **PRD.md**; get approval.
2. **Plan** – Update **ROADMAP.md** → initialise **STATE.md**.
3. **Design docs** – Update **ARCHITECTURE.md** & other docs _before_ coding.
4. **Implement** – Code & tests; update **ROADMAP.md** & **STATE.md** continuously.
5. **Verify** – Ensure docs match reality.
6. **Deploy** – Follow **DEPLOYMENT.md**; log final state in **STATE.md**.

## 7. STATE.md Schema (summary)

- JSON with: `version`, `lastUpdated`, `projectProgress`, `implementationState` (features, tests, branches), `nextSteps`.
- Update **before & after** each coding session. Use ISO dates (`YYYY‑MM‑DD`).

## 8. Dates & Commits

- Use absolute dates (e.g., `2025‑05‑30`).
- Standard commit flow:

  ```bash
  git add .
  git commit -m "<message>"
  git push
  ```

---

### Remember

- **Azure PaaS only.**
- **Doc‑first.** `PRD.md` & `STATE.md` are authoritative.
- No confirmation needed for routine git/CI actions.
- No TODOs in code; open issues instead.
