!macro NSIS_HOOK_POSTINSTALL
  CreateShortcut "$DESKTOP\Trading Journal Dev.lnk" "$INSTDIR\Trading Journal Dev.exe"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$DESKTOP\Trading Journal Dev.lnk"
!macroend
