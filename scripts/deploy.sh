#!/bin/sh
# Déploie l'app sur GitHub Pages (branche gh-pages du dépôt).
set -e
cd "$(dirname "$0")/.."

DEPLOY_BASE=/oxford-3000/ npm run build
touch dist/.nojekyll

cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -qm "deploy $(date +%F-%H%M)"
git push -f git@github.com:adrien-lebreton/oxford-3000.git gh-pages
cd ..
rm -rf dist/.git

echo "Déployé → https://adrien-lebreton.github.io/oxford-3000/ (propagation ~1-2 min)"
