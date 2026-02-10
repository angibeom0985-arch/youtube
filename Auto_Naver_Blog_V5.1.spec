# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_data_files, collect_submodules, collect_dynamic_libs, copy_metadata

hiddenimports = [
    'PyQt6.QtCore',
    'PyQt6.QtGui',
    'PyQt6.QtWidgets',
    'PyQt6.sip',
    'license_check',
]
hiddenimports += collect_submodules('moviepy')
hiddenimports += collect_submodules('imageio')
hiddenimports += collect_submodules('imageio_ffmpeg')

datas = [
    ('setting', 'setting'),
]
datas += collect_data_files('moviepy')
datas += collect_data_files('imageio')
datas += collect_data_files('imageio_ffmpeg')
datas += copy_metadata('imageio')
datas += copy_metadata('moviepy')
datas += copy_metadata('imageio_ffmpeg')

binaries = []
binaries += collect_dynamic_libs('imageio_ffmpeg')


a = Analysis(
    ['Auto_Naver_Blog_V5.1.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['PyQt5', 'tkinter', 'matplotlib'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='Auto_Naver_Blog_V5.1',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['setting\\etc\\david153.ico'],
)
