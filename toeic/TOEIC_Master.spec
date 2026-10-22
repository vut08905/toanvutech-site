# -*- mode: python ; coding: utf-8 -*-

import os

datas = [
    ('index.html', '.'),
    ('study.html', '.'),
    ('styles.css', '.'),
    ('study.css', '.'),
    ('app.js', '.'),
    ('study.js', '.'),
    ('data.js', '.'),
    ('study_data.js', '.'),
    ('media', 'media'),
]

a = Analysis(
    ['run_app.py'],
    pathex=['.'],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'http.server',
        'socketserver',
        'webbrowser',
        'socket',
        'mimetypes',
        'threading',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter', 'matplotlib', 'numpy', 'scipy', 'torch', 'cv2',
        'unittest', 'pydoc', 'xmlrpc', 'sqlite3', 'email.test', 'distutils',
        'lib2to3', 'test'
    ],
    noarchive=False,
    optimize=1,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='TOEIC_Master',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='app_icon.ico',
)
