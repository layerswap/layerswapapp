if [ "$VERCEL_GIT_COMMIT_REF" = "gh-pages" ]; then
  echo "Skipping build for gh-pages branch"
  exit 0
else
  exit 1
fi