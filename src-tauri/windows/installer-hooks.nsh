!macro NSIS_HOOK_POSTINSTALL
  CreateShortcut "$DESKTOP\Trading Journal.lnk" "$INSTDIR\Trading Journal.exe"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$DESKTOP\Trading Journal.lnk"
!macroend
