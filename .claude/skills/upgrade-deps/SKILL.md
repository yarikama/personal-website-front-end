---
name: upgrade-deps
description: Upgrade the site's npm dependencies, above all when npm audit reports a vulnerability. Use when asked to upgrade or bump packages, fix a CVE or advisory in a dependency, or when npm audit is not clean.
user-invocable: true
disable-model-invocation: false
---

# Upgrading dependencies

**The owner's rule: upgrade, don't pin.** When something needs upgrading (a
vulnerability above all), upgrade *everything* to the latest, majors included,
not only the vulnerable package, and don't hold versions back out of caution.
CI (lint, tests, type check and build) is what makes sure it still works.

The only hold worth keeping is one for a **known incompatibility that a check
caught**, never a guess. package.json has no comments, so list each hold under
"Holds" below, with why and what lifts it, and say so in the commit. Next
time, check whether the reason still holds, and drop the hold if not.

## Steps

Work in a worktree next to the repo, never in the main checkout (the owner and
other sessions use it), and remove it once its PR is merged:

```bash
git fetch origin
git worktree add -b chore/upgrade-deps ../personal-website-front-end-deps origin/main
cd ../personal-website-front-end-deps
npm ci
```

1. **See what's flagged.** CI does not run the audit, so run it yourself:
   ```bash
   npm audit
   ```
   Read each advisory: say in the commit whether it reaches the shipped site
   (a package bundled into the browser) or only the build and dev tools.

2. **Upgrade everything to the latest**, majors included. `npm update` alone
   stays inside the ranges in package.json; npm-check-updates moves the ranges:
   ```bash
   npx npm-check-updates -u
   npm install
   npm audit fix        # what's left deeper in the tree
   ```
   Note what changed, and every major version crossed.

3. **Run what CI runs**, then the audit again, which must be clean:
   ```bash
   npm run lint && npm test && npm run build && npm audit
   ```
   `npm run build` type-checks (tsc) and bundles, as Vercel does.

4. **If something breaks**, read the package's release notes or migration guide
   and fix the code. Keep a package back only when it can't work with another's
   new version yet: pin its range in package.json and add it to "Holds" below.

5. **Look at it.** Majors of React, the router, Vite, Tailwind, three.js or
   Motion can change what renders without failing a test: run `npm run dev`
   and open the home page, `/works`, a note, `/learnings` and a learning page.

6. **Commit package.json and package-lock.json**, as
   `chore(deps): everything to the latest, past <advisory>`. Say in the message:
   the advisories and whether they reach the site, how many packages changed and
   the notable ones, majors crossed, and any hold with its reason. Open a PR
   against `main` with the same, and a test plan.

## Holds

None yet.
