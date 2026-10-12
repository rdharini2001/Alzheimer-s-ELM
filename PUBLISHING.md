# Publish on GitHub

Extract the **public-release ZIP** (not the complete private research ZIP). The public bundle contains code, documentation, tests, and aggregate figures/tables. OASIS subject records and journal content are excluded.

```bash
git init -b main
git add .
git commit -m "Release OASIS-2 ELM companion code"
git remote add origin https://github.com/YOUR_USERNAME/oasis-elm-companion-code.git
git push -u origin main
```

Create `oasis-elm-companion-code` as an empty GitHub repository under your account first, or use `gh repo create oasis-elm-companion-code --public --source=. --remote=origin --push` after committing. All dataset access instructions appear in `data/README.md`.
