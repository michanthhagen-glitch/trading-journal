!define MUI_DIRECTORYPAGE_TEXT_TOP "Choose where MethodMark should be installed. You can use another drive, for example D:\MethodMark."
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Install folder"

!macro NSIS_HOOK_POSTINSTALL
  Delete "$DESKTOP\Trading Journal.lnk"
  CreateShortcut "$DESKTOP\MethodMark.lnk" "$INSTDIR\MethodMark.exe"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$DESKTOP\MethodMark.lnk"
  Delete "$DESKTOP\Trading Journal.lnk"
!macroend
