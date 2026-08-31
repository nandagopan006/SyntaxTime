#!/usr/bin/env bash
# What the host runs to prepare SyntaxTime before starting it.
#
# `set -o errexit` stops at the first failing command, so a broken deployment
# fails loudly during the build instead of starting a half-built application.
set -o errexit

pip install -r requirements.txt

# Gathers the admin's CSS and JavaScript into STATIC_ROOT for WhiteNoise to
# serve. --no-input because there is no one at a terminal to answer prompts.
python manage.py collectstatic --no-input

# Applies any new migrations to Neon. Safe to run on every deploy: migrations
# already applied are skipped.
python manage.py migrate
