# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller Specification for Roman's Rater 4.21
Builds standalone desktop executable with bundled dependencies
"""

import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# Collect data files
datas = [
    ('data/*.xlsx', 'data'),
    ('data/config.json', 'data'),
]

# Collect hidden imports
hiddenimports = [
    'pdfplumber',
    'PyMuPDF',
    'fitz',
    'pytesseract',
    'openpyxl',
    'pandas',
    'nicegui',
]

# Collect all nicegui dependencies
hiddenimports += collect_submodules('nicegui')

block_cipher = None

a = Analysis(
    ['src/main.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='RomansRater',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Set to True for debugging
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Add icon file path if available
)

# For directory mode (faster startup, multiple files):
# coll = COLLECT(
#     exe,
#     a.binaries,
#     a.zipfiles,
#     a.datas,
#     strip=False,
#     upx=True,
#     upx_exclude=[],
#     name='RomansRater',
# )
