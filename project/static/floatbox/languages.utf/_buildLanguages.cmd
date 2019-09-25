@echo off

pushd %~dp0
if exist ..\languages\* (
	echo.
	set /p yn=OK to empty existing 'languages' folder? [y/n]
	if /i [%yn%] NEQ [y] goto :EOF
	rd /s /q ..\languages\ > nul
)
md ..\languages\

for %%F in (??.*js) do (
	cscript.exe //nologo _encodeOneFile.js %%F
)

popd
