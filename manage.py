#!/usr/bin/env python
"""Simple wrapper to run the backend from root directory."""
import subprocess
import sys
import os

os.chdir('backend')
sys.exit(subprocess.call([sys.executable, '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', os.environ.get('PORT', '8000')]))
