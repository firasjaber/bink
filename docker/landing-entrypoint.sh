#!/bin/sh
set -eu

: "${LANDING_APP_URL:=https://binkapp.firrj.com}"
: "${LANDING_GITHUB_URL:=https://github.com/firasjaber/bink}"
: "${LANDING_GITHUB_ISSUES_URL:=https://github.com/firasjaber/bink/issues/new}"

envsubst '$LANDING_APP_URL $LANDING_GITHUB_URL $LANDING_GITHUB_ISSUES_URL' \
  < /usr/share/nginx/html/index.html.template \
  > /usr/share/nginx/html/index.html
