!define MUI_DIRECTORYPAGE_TEXT_TOP "Choose where Trading Journal should be installed. You can use another drive, for example D:\Trading Journal."
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Install folder"

!macro NSIS_HOOK_POSTINSTALL
  CreateShortcut "$DESKTOP\Trading Journal.lnk" "$INSTDIR\Trading Journal.exe"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$DESKTOP\Trading Journal.lnk"
!macroend
