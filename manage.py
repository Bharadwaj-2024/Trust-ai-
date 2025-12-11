#!/usr/bin/env python
"""Deployment wrapper for Render - runs backend from root directory."""
import subprocess
import sys
import os

# Change to backend directory
os.chdir('backend')

# Get port from environment (Render sets this)
port = os.environ.get('PORT', '8000')

# Start uvicorn with proper settings for Render
sys.exit(subprocess.call([
    sys.executable, '-m', 'uvicorn', 
    'main:app', 
    '--host', '0.0.0.0', 
    '--port', port
]))
