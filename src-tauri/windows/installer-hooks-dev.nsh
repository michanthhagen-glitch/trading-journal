!macro NSIS_HOOK_POSTINSTALL
  Delete "$DESKTOP\Trading Journal Dev.lnk"
  CreateShortcut "$DESKTOP\MethodMark Dev.lnk" "$INSTDIR\MethodMark Dev.exe"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$DESKTOP\MethodMark Dev.lnk"
  Delete "$DESKTOP\Trading Journal Dev.lnk"
!macroend
